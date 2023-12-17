/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, middleName }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.middleName = middleName
    /** @type {Reservation[]} */
    this.reservations = []
  }

  get fullName() {
    return this.middleName ? `${this.firstName} ${this.middleName} ${this.lastName}` : `${this.firstName} ${this.lastName}`;
  }

  /**
   * filter all customers by name
   * @param {string} nameLike 
   * @returns 
   */
  static async filterByName(nameLike) {
    const results = await db.query(
      `
      WITH rs AS (
        SELECT r.* 
        FROM reservations r
        INNER JOIN (
          SELECT r2.customer_id, MAX(r2.start_at) as max_date
          FROM reservations r2
          GROUP BY r2.customer_id
        ) AS rMax ON rMax.customer_id = r.customer_id AND r.start_at = rMax.max_date
      )
      SELECT
          c.id,
          c.first_name AS "firstName",
          c.last_name AS "lastName",
          c.middle_name AS "middleName",
          c.phone,
          c.notes,
          json_build_object(
            'id', rs.id,
            'startAt', rs.start_at,
            'numGuests', rs.num_guests,
            'customerId', rs.customer_id,
            'notes', rs.notes
          ) AS "lastReservation"
      FROM customers c
      LEFT JOIN rs ON rs.customer_id = c.id
      
      WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1
      ORDER BY c.last_name, c.first_name`,
      [`%${nameLike}%`]
    );
    return results.rows.map(c => {
      const customer = new Customer(c);
      if (!c.lastReservation || !c.lastReservation.id) {
        customer.lastReservation = null
        return customer
      }
      customer.lastReservation = new Reservation(c.lastReservation)

      return customer
    });
  }

  static async getTopCustomers(limit=10) {
    const result = await db.query(
      `SELECT c.id,
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        middle_name AS "middleName",
        c.phone,
        c.notes,
        COUNT(c.id) AS totalReservations
      FROM customers c
      LEFT JOIN reservations r
      ON c.id = r.customer_id
      GROUP BY c.id
      ORDER BY totalReservations DESC
      LIMIT $1`, 
      [limit]
    );
    return result.rows.map(c => new Customer(c))
  }

  static async getWithMostReservations(customerId) {
    const result = await db.query(
      `SELECT c.id,
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        middle_name AS "middleName",
        c.phone,
        c.notes,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', r.id, 
            'startAt', r.start_at, 
            'numGuests', r.num_guests, 
            'notes', r.notes, 
            'customerId', r.customer_id
          )
          ORDER BY r.start_at DESC
        ) AS reservations
      FROM customers c
      LEFT JOIN reservations r
      ON c.id = r.customer_id
      WHERE c.id = $1
      GROUP BY c.id
      `, [customerId]
    )
    const customer = new Customer(result.rows[0])
    customer.reservations = result.rows[0].reservations.map(r = new Reservation(r))
    return customer
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName",
         middle_name AS "middleName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         middle_name AS "middleName",
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes, middle_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes, this.middleName]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4, middle_name=$6
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id, this.middleName]
      );
    }
  }
}

module.exports = Customer;
