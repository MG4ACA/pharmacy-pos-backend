import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Category, Product, ProductType } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeNameForKey(s) {
  if (!s) return null;
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function seedProductsFromCsv(csvPath) {
  const absolutePath =
    csvPath || path.resolve(__dirname, '../../../items_export_enriched_camcase.csv');
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  // collect unique categories and product types
  const categoriesSet = new Map();
  const productTypesSet = new Map();

  for (const r of records) {
    const cat = r['category_mapped'] || r['Category'];
    const pt = r['product_type'];
    if (cat) categoriesSet.set(normalizeNameForKey(cat), cat.trim());
    if (pt) productTypesSet.set(normalizeNameForKey(pt), pt.trim());
  }

  // ensure categories exist
  const categoryMap = {};
  for (const [key, rawName] of categoriesSet.entries()) {
    if (!key) continue;
    const name = rawName;
    const [instance] = await Category.findOrCreate({
      where: { name },
      defaults: { name, description: null },
    });
    categoryMap[key] = instance.id;
  }

  // ensure product types exist
  const productTypeMap = {};
  for (const [key, rawName] of productTypesSet.entries()) {
    if (!key) continue;
    const name = rawName;
    const [instance] = await ProductType.findOrCreate({
      where: { name },
      defaults: { name, description: null },
    });
    productTypeMap[key] = instance.id;
  }

  // process rows
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const r of records) {
    const upc = (r['UPC/EAN/ISBN'] || '').toString().trim() || null;
    const name = (r['Item Name'] || '').toString().trim();
    if (!name) {
      skipped++;
      continue;
    }

    const catRaw = r['category_mapped'] || r['Category'] || null;
    const ptRaw = r['product_type'] || null;
    const catKey = normalizeNameForKey(catRaw);
    const ptKey = normalizeNameForKey(ptRaw);
    const category_id = categoryMap[catKey] || null;
    const product_type_id = productTypeMap[ptKey] || null;

    try {
      // try to find existing by upc if present, else by name+category
      let exists = null;
      if (upc) {
        exists = await Product.findOne({ where: { upc } });
      }
      if (!exists) {
        if (category_id) {
          exists = await Product.findOne({ where: { name, category_id } });
        } else {
          exists = await Product.findOne({ where: { name } });
        }
      }

      if (exists) {
        skipped++;
        continue;
      }

      await Product.create({
        name,
        barcode: null,
        upc,
        product_type_id: product_type_id || 1,
        category_id: category_id || 1,
        description: null,
      });
      created++;
    } catch (err) {
      errors.push({ row: name, error: err.message });
    }
  }

  return { created, skipped, errors };
}

export default seedProductsFromCsv;
