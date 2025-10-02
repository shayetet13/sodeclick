#!/usr/bin/env node

/**
 * Script สำหรับ copy Service Worker ไปยัง public folder ใน development
 * เพื่อให้ Vite สามารถให้บริการไฟล์ด้วย MIME type ที่ถูกต้อง
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, '../../public/sw-auto-refresh.js');
const targetFile = path.join(__dirname, '../../public/sw-auto-refresh-dev.js');

// อ่านไฟล์ต้นฉบับ
try {
  const content = fs.readFileSync(sourceFile, 'utf8');

  // ปรับแต่งเนื้อหาให้เหมาะกับ development
  const devContent = content.replace(
    "const API_BASE_URL = 'http://localhost:5000'; // ควรใช้ environment variable",
    "const API_BASE_URL = 'http://localhost:5000'; // Development mode"
  );

  // เขียนไฟล์สำหรับ development
  fs.writeFileSync(targetFile, devContent);

  console.log('✅ Service Worker copied for development mode');
  console.log('📁 Source:', sourceFile);
  console.log('📁 Target:', targetFile);

} catch (error) {
  console.error('❌ Error copying Service Worker:', error.message);
  process.exit(1);
}
