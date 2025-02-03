"use strict";

require('dotenv').config();
const express = require(`express`);
const cors = require(`cors`);
const { PrismaClient } = require(`@prisma/client`);
const jwt = require(`jsonwebtoken`);
const bcrypt = require(`bcrypt`);
const axios = require('axios');
const geminiApiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
console.log(url);

const port = 3000;

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get(`/`, (req, res) => {
    res.send(`Yemek Tarifleri AI uygulaması ${port} portunda çalışıyor`)
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

})

app.post(`/auth/signup`, async (req, res) => {

    const { name, email, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                status: `error`,
                message: `Bu mail sistemde bulunuyor`
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword
            }
        })


        const token = jwt.sign({ userId: newUser.id }, `secretkey`, { expiresIn: `1h` });

        res.status(200).json({
            status: `success`,
            token
        })
    } catch (error) {
        console.log(`Error:${error}`);
        res.status(400).json({
            status: `error`,
            message: `Something went wrong!`
        })
    }

})

app.post(`/auth/login`, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            res.status(400).json({
                status: `error`,
                message: `Email veya şifre hatalı `
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isPasswordValid) {
            res.status(400).json({
                status: `error`,
                message: `Email veya şifre hatalı`
            })
        }

        const token = jwt.sign({ userId: user.id }, `secretkey`, { expiresIn: `1h` });

        res.status(200).json({
            status: `success`, token
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: `error`,
            message: `Bir şeyler ters gitti`
        })
    }
})

const authenticateToken = (req, res, next) => {
    const token = req.header(`Authorization`)?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            status: `error`,
            message: `Geçersiz token`
        })
    }

    jwt.verify(token, `secretkey`, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                status: `error`,
                message: `Erişim reddedildi.Geçersiz token.`
            })
        }
        req.user = decoded;
        next();
    })

}


app.post(`/recipe`, authenticateToken, async (req, res) => {
    const { ingredients } = req.body;

    if (!ingredients) {
        res.status(400).json({
            status: `error`,
            comment: `Soru girilmedi`
        })
    }

    try {
        const prompt = `Bir şef gibi davran, kullanıcının verdiği malzemeleri incele ve yapılabilecek yemekleri öner. 
        Önerilen yemekler için detaylı tarifler hazırla.Tariflerin kolay anlaşılır olması önemli. 
        Lütfen aşağıdaki gereksinimlere uygun olacak şekilde bir örnek yazılım veya model çıktısı oluştur:

        Malzeme listesine göre yemek önerisi yap.
        Her yemek için:
        Yemek adı,
        Kaç kişilik olduğu,
        Gerekli malzemelerin listesi (var olan malzemeler ve eklenmesi gerekenler),
        Yapım aşamaları gibi bilgileri döndür.
        Çıkış formatı sade ve okunaklı olsun.
        Örnek Malzeme Listesi: Domates, soğan, sarımsak, makarna, zeytinyağı, tuz."

        Beklenen Çıkış Örneği:

        Kullanıcının verdiği malzemeler:${ingredients}
`
        console.log(`Generated prompt:${prompt}`)

        const geminiResponse = await axios.post(
            url,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Gemini API Full Response:', JSON.stringify(geminiResponse.data, null, 2));

        const aiAnswer =
            geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Yanıt alınamadı';

        const savedRecipe = await prisma.recipe.create({
            data: {
                userId: req.user.userId,
                text: ingredients,
                answer: aiAnswer,
            }
        })

        res.status(200).json({
            status: `success`,
            comment: aiAnswer
        })
    } catch (error) {
        res.status(500).json({
            status: `error`,
            comment: error
        })
    }
})

app.get(`/users/recipes/:userId`, async (req, res) => {
    const { userId } = req.params;
    console.log(userId);
    try {
        const existUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        console.log(existUser);

        if (!existUser) {
            return res.status(404).json({
                status: `error`,
                message: `Kullanıcı bulunamadı`
            })
        }

        const existRecipes = await prisma.recipe.findMany({
            where: { userId: userId },
            select: {
                text: true,
                answer: true,
            }
        });

        console.log(existRecipes);

        if (!existRecipes || existRecipes.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Bu kullanıcıya ait tarif bulunamadı.'
            });
        }

        res.status(200).json({
            status: 'success',
            recipes: existRecipes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'Kullanıcı tariflerini çekerken bir hata oluştu.'
        });
    }
})