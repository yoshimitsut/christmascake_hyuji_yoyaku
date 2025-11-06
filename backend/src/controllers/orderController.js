import pool from '../config/database.js';

export const createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { customer_name, customer_phone, customer_email, date, cakes, notes } = req.body;
    
    // Calcular total
    const total_amount = cakes.reduce((sum, cake) => sum + (cake.price * cake.amount), 0);
    
    // Inserir pedido
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_name, customer_phone, customer_email, date, total_amount, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_phone, customer_email, date, total_amount, notes]
    );
    
    const orderId = orderResult.insertId;
    
    // Inserir itens do pedido e atualizar estoque
    for (const cake of cakes) {
      // Inserir item do pedido
      await connection.execute(
        `INSERT INTO order_items (order_id, cake_id, amount, unit_price, subtotal) 
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, cake.id, cake.amount, cake.price, cake.price * cake.amount]
      );
      
      // Atualizar estoque
      await connection.execute(
        'UPDATE cakes SET stock = stock - ? WHERE id = ?',
        [cake.amount, cake.id]
      );
      
      // Registrar movimentação de estoque
      await connection.execute(
        `INSERT INTO stock_movements (cake_id, movement_type, quantity, reason, reference_id) 
         VALUES (?, 'out', ?, 'Order sale', ?)`,
        [cake.id, cake.amount, orderId]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      orderId,
      total_amount 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order: ' + error.message });
  } finally {
    connection.release();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    
    let query = `
      SELECT o.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', c.id,
                 'name', c.name,
                 'size', c.size,
                 'amount', oi.amount,
                 'price', oi.unit_price,
                 'subtotal', oi.subtotal
               )
             ) as cakes
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN cakes c ON oi.cake_id = c.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (start_date) {
      conditions.push('o.date >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      conditions.push('o.date <= ?');
      params.push(end_date);
    }
    
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY o.id ORDER BY o.date DESC, o.created_at DESC';
    
    const [orders] = await pool.execute(query, params);
    
    res.json(orders);
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};