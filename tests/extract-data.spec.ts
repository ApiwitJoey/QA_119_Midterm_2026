import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Data Extraction - Export Master Data to CSV', () => {

    test('กวาดข้อมูล Subjects, States และ Cities แล้ว Export เป็น CSV', async ({ page }) => {
        await page.goto('https://demoqa.com/automation-practice-form');
        await page.evaluate(() => document.body.style.zoom = '0.7');

        console.log('🚀 เริ่มกระบวนการดึงข้อมูล...');

        // ======================================================
        // 📌 ส่วนที่ 1: ดึงข้อมูล Subjects โดยค้นหาจากสระ 'a', 'e', 'i', 'o', 'u'
        // ======================================================
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const uniqueSubjects = new Set<string>(); // ใช้ Set เพื่อป้องกันวิชาซ้ำกัน

        for (const vowel of vowels) {
            const subjectInput = page.locator('#subjectsInput');
            await subjectInput.fill(vowel);
            
            // รอจนกว่า Dropdown option จะโผล่ขึ้นมา
            const optionLocator = page.locator('[id^="react-select-2-option"]');
            
            try {
                // ใส่ timeout สั้นๆ เผื่อกรณีพิมพ์สระบางตัวแล้วไม่มีวิชาแนะนำโผล่มา
                await optionLocator.first().waitFor({ state: 'visible', timeout: 3000 });
                const subjects = await optionLocator.allInnerTexts();
                subjects.forEach(sub => uniqueSubjects.add(sub));
            } catch (error) {
                // ถ้าไม่มี dropdown เด้งขึ้นมา ให้ปล่อยผ่านไป
            }
            
            // เคลียร์ค่าช่องค้นหาสำหรับสระตัวถัดไป
            await subjectInput.clear();
        }

        const subjectsArray = Array.from(uniqueSubjects).sort();
        console.log(`✅ ดึงข้อมูล Subjects สำเร็จ: ได้ทั้งหมด ${subjectsArray.length} วิชา`);

        // ======================================================
        // 📌 ส่วนที่ 2: ดึงข้อมูล City ตาม State ที่ระบุ
        // ======================================================
        const targetStates = ['NCR', 'Uttar Pradesh', 'Haryana', 'Rajasthan'];
        const stateCityRecords: { state: string, city: string }[] = [];

        for (const state of targetStates) {
            // 1. พิมพ์และเลือก State
            await page.locator('#react-select-3-input').fill(state);
            await page.keyboard.press('Enter');

            // 2. คลิกเพื่อเปิด Dropdown ของ City
            await page.locator('#city').click();

            // 3. รอและดึงข้อมูล City ทั้งหมดใน State นั้นๆ
            const cityOptionLocator = page.locator('[id^="react-select-4-option"]');
            await cityOptionLocator.first().waitFor({ state: 'visible' });
            
            const cities = await cityOptionLocator.allInnerTexts();
            cities.forEach(city => {
                stateCityRecords.push({ state, city });
            });
        }

        console.log(`✅ ดึงข้อมูล State & City สำเร็จ: ได้ทั้งหมด ${stateCityRecords.length} คู่`);

        // ======================================================
        // 📌 ส่วนที่ 3: Export ข้อมูลออกเป็นไฟล์ CSV
        // ======================================================
        // เตรียมโฟลเดอร์ data/ ให้พร้อม (ถ้ายังไม่มี)
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // 📝 3.1 เขียนไฟล์ subjects.csv
        const subjectsCsvPath = path.join(dataDir, 'master_subjects.csv');
        // ใส่ Header (บรรทัดแรก) และต่อด้วยข้อมูลแต่ละบรรทัด
        const subjectsCsvContent = 'subjectName\n' + subjectsArray.join('\n');
        fs.writeFileSync(subjectsCsvPath, subjectsCsvContent, 'utf-8');

        // 📝 3.2 เขียนไฟล์ state_city.csv
        const stateCityCsvPath = path.join(dataDir, 'master_state_city.csv');
        // ใส่ Header
        let stateCityCsvContent = 'state,city\n';
        stateCityRecords.forEach(record => {
            stateCityCsvContent += `"${record.state}","${record.city}"\n`;
        });
        fs.writeFileSync(stateCityCsvPath, stateCityCsvContent, 'utf-8');

        console.log('======================================================');
        console.log(`🎉 สร้างไฟล์ CSV สำเร็จแล้ว! ตรวจสอบไฟล์ได้ที่:`);
        console.log(`- ${subjectsCsvPath}`);
        console.log(`- ${stateCityCsvPath}`);
        console.log('======================================================');
    });
});