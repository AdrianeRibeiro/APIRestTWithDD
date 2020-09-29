const request = require('supertest')
const app = require('../../src/app')
const jwt = require('jwt-simple')
const MAIN_ROUTE = '/v1/transactions'

let user
let user2
let accUser
let accUser2

beforeAll(async () => {
  //limpar o banco
  await app.db('transactions').del()
  await app.db('accounts').del()
  await app.db('users').del()

  const users = await app.db('users').insert([
    { name: 'User #1', mail: 'user@mail.com', passwd: '$2a$10$N25w6YP9amXoKZexqzgcner10vcClBBOVYopI1tw9ANDyx6Rw.QXu' },
    { name: 'User #2', mail: 'user2@mail.com', passwd: '$2a$10$N25w6YP9amXoKZexqzgcner10vcClBBOVYopI1tw9ANDyx6Rw.QXu' }
  ], '*')
  
  user = users[0]
  user2 = users[1]

  delete user.password
  user.token =  jwt.encode(user, 'Segredo!')

  const accs = await app.db('accounts').insert([
    { name: 'Acc #1', user_id: user.id },
    { name: 'Acc #2', user_id: user2.id }
  ], '*')

  accUser = accs[0]
  accUser2 = accs[1]
})

test('Deve listar apenas as transações do usuário', () => {
  return app.db('transactions').insert([
    { description: 'T1', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id },
    { description: 'T2', date: new Date(), amount: 300, type: 'O', acc_id: accUser2.id },
  ]).then(() => request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].description).toBe('T1')
    }))
})

test('Deve inserir uma transação com sucesso', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id })
    .then((res) => {
      expect(res.status).toBe(201)
      expect(res.body.acc_id).toBe(accUser.id)
    })
})

test('Deve retornar uma transação por ID', () => {
  return app.db('transactions').insert(
    { description: 'T ID', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id']
  ).then(trans => request(app).get(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(trans[0].id)
      expect(res.body.description).toBe('T ID')
  }))
})

test('Deve atualizar uma transação', () => {
  return app.db('transactions').insert(
    { description: 'T Update', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id']
  ).then(trans => request(app).put(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'Updated' })
    .then((res) => {
      expect(res.status).toBe(200)
      expect(res.body.description).toBe('Updated')
  }))
})

test('Deve remover uma transação', () => {
  return app.db('transactions').insert(
    { description: 'T delete', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id']
  ).then(trans => request(app).delete(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(204)
  }))
})