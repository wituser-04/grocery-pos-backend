const { addProduct, closeDb } = require('./database');

async function seedDatabase() {
  try {
    console.log('🌾 Seeding database...');
    
    // Test products
    await addProduct('salt', 20, 'packet', 100);
    await addProduct('sugar', 42, 'kg', 50);
    await addProduct('milk', 30, 'packet', 50);
    
    console.log('✅ Database seeded successfully!');
    console.log('Products added: salt, sugar, milk');
    console.log('Test voice commands: "add sugar", "two packets milk", etc.');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    closeDb();
  }
}

seedDatabase();

