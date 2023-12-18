const app = require("./app");
const Customer = require('./models/customer');
const supertest = require('supertest');
const { JSDOM } = require('jsdom')

describe('Homepage', () => {
  it('should render the homepage', async () => {
    const res = await supertest(app).get('/');
    expect(res.statusCode).toEqual(200);
    const dom = new JSDOM(res.text)
    const customerList = await Customer.filterByName('')
    const ul = dom.window.document.querySelectorAll('ul')[1]
    expect(ul.childElementCount).toBe(customerList.length)
    for (let idx = 0; idx < customerList.length; idx++) {
      expect(ul.children.item(idx).textContent).toContain(customerList[idx].fullName)
    }
  })
  it('should render customer list with filter', async () => {
    const res = await supertest(app).get('/?filterByName=er');
    expect(res.statusCode).toEqual(200);
    const dom = new JSDOM(res.text)
    const customerList = await Customer.filterByName('er')
    const ul = dom.window.document.querySelectorAll('ul')[1]
    expect(ul.childElementCount).toBe(customerList.length)
    for (let idx = 0; idx < customerList.length; idx++) {
      expect(ul.children.item(idx).textContent).toContain(customerList[idx].fullName)
    }
  })
  it('should render customer detail', async () => {
    const res = await supertest(app).get('/1/');
    expect(res.statusCode).toEqual(200);
    const dom = new JSDOM(res.text)
    const doc = dom.window.document
    const customer = await Customer.get(1)
    expect(doc.querySelector('h1').textContent).toContain(customer.fullName)
    expect(doc.querySelectorAll('p')[0].textContent).toContain(customer.phone)
    expect(doc.querySelectorAll('p')[1].textContent).toContain(customer.notes)
  })
})