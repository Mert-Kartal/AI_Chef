# Yemek Tarifi AI

## Katılımcılar
- Raziye <3
- Mert

### Beklenenler
- Express.js ile sunucu 
- Prisma ile veri tabanı 
  
### Gerekli kütüphaneler
- Express.js
- Prisma.js
- Cors

### Teknoloji 
- SQ Lite
- Prisma Client
- Gemini API

### Konu
- Elimizdeki malzemeler ile yapılabilecek yemekleri veren bir AI için gerekli endpointleri yazın

### Endpointler

- /auth/signup
  - Hesap oluşturma 
  - Bu endpoint ile yeni hesap oluşturulacak ve db ya kaydedilecek
  - body:
    name: string
    email: string
    password: string
  - response:
    status: sucess | error
    token: string

- /auth/login
  - Hesaba giris
  - Bu endpoint ile hesaba giris yapilacak
  - body:
    email: string
    password: string
  - response:
    status: success | error
    token: string

- /recipe
  - AI'a sorulacak endpoint
  - Sorulari da kullaniciya kaydedelim
  - headers:
    Authorization: "Bearer ${token}"
  - body:
    - recipe: string
  - method:
    - post
  - response:
    status: success | error
    comment: string

- /users/recipes/:userId
  - User id ile kullanicinin daha onceki tariflerini alin
  - Path param:
    userId: string
  - response:
    status: success | error
    recipes: Recipe[]

### Dil

- Javascript

### Kaynaklar

- Prisma sqlite: [Prisma-Sqlite](https://www.prisma.io/docs/getting-started/quickstart-sqlite)

### Enpoint Table

| endpoint                | method | response   |
| ----------------------- | ------ | ---------- |
| /auth/login             | post   | token      |
| /auth/signup            | post   | token      |
| /recipe                 | post   | comment    |
| /users/recipes/:userId  | get    | Question[ ] |

## Model

**User**
{
id: string (unique)
recipes: Recipe[ ]
email: string
hashedPassword: string
name: string
}

**Recipe**
{
text: string
id: string
userId: ForeignKey(string)
answer: string
}