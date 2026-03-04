import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../pages/RegistrationPage';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { RegistrationData } from '../types/RegistrationData';

// 1. อ่านและแปลงไฟล์ CSV เป็น Array ของ Object
const csvFilePath = path.join(__dirname, '../data/formData.csv');
const records: RegistrationData[] = parse(fs.readFileSync(csvFilePath, 'utf-8'), {
    columns: true, 
    skip_empty_lines: true,
});

test.describe('Student Registration Form - Data-Driven Testing', () => {
    let registrationPage: RegistrationPage;

    test.beforeEach(async ({ page }) => {
        registrationPage = new RegistrationPage(page);
        await registrationPage.navigate();
        await page.evaluate(() => document.body.style.zoom = '0.7'); 
    });

    // 2. วนลูปสร้าง Test Case ตามจำนวนแถวใน CSV
    for (const record of records) {
        test(`${record.testCaseId}: ${record.scenario}`, async ({ page }) => {
            
            // ใช้ || '' เพื่อป้องกัน error หากค่าเป็น undefined และเป็นการ clear ช่องให้ว่างเปล่า
            await registrationPage.fillName(record.firstName || '', record.lastName || '');
            await registrationPage.fillEmail(record.email || '');
            
            // ดัก if ไว้ สำหรับพวกปุ่มคลิกต่างๆ ถ้าไม่มีค่ามา จะได้ไม่พยายามไปคลิกให้เกิด Error
            if (record.gender) {
                await registrationPage.selectGender(record.gender as 'Male' | 'Female' | 'Other');
            }
            
            await registrationPage.fillMobile(record.mobile || '');

            const inputValue = await registrationPage.mobileInput.inputValue();
            if (record.mobile && record.mobile.length > 10) {
                // if mobile have morethan 10 digit return fail
                expect(inputValue, 'Input should be exactly what we provided in CSV (11 digits)').toBe(record.mobile);
            }
            
            if (record.dob) {
                await registrationPage.fillDateOfBirth(record.dob);
            }
            
            if (record.subjects) {
                const subjectsArr = record.subjects.split('|');
                for (const sub of subjectsArr) {
                    if (sub) await registrationPage.addSubject(sub);
                }
            }

            if (record.hobbies) {
                const hobbiesArr = record.hobbies.split('|') as ('Sports' | 'Reading' | 'Music')[];
                await registrationPage.selectHobbies(hobbiesArr);
            }

            if (record.picture) {
                const filePath = path.join(__dirname, `../data/${record.picture}`);
                if (fs.existsSync(filePath)) {
                    await registrationPage.uploadProfilePicture(filePath);
                }
            }

            await registrationPage.fillAddress(record.address || '');
            
            if (record.state) await registrationPage.selectState(record.state);
            if (record.city) await registrationPage.selectCity(record.city);

            // กดปุ่ม Submit
            await registrationPage.clickSubmit();

            // --- ตรวจสอบผลลัพธ์ ---
            if (record.expectedResult === 'success') {
                await registrationPage.verifySuccessModal(record);
                
            } else if (record.expectedResult === 'error_mandatory') {
                // check feild must have
                const isFirstNameValid = await registrationPage.firstNameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
                const isLastNameValid = await registrationPage.lastNameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
                const isMobileValid = await registrationPage.mobileInput.evaluate((el: HTMLInputElement) => el.checkValidity());
                const isGenderSelected = await page.locator('input[name="gender"]:checked').count() > 0;

                const errorDetails = [
                    !isFirstNameValid ? '' : 'First Name should be invalid',
                    !isLastNameValid ? '' : 'Last Name should be invalid',
                    !isMobileValid ? '' : 'Mobile should be invalid',
                    isGenderSelected ? 'Gender should not be selected' : ''
                ].filter(msg => msg !== '').join(' | ');

                expect(isFirstNameValid && isLastNameValid && isMobileValid && isGenderSelected, errorDetails).toBeFalsy();
            } else if (record.expectedResult === 'error_mobile') {
                const isMobileValid = await registrationPage.mobileInput.evaluate((el: HTMLInputElement) => el.checkValidity());

                expect(isMobileValid, `Mobile validation should fail for input: "${record.mobile}"`).toBeFalsy();            
            } else if (record.expectedResult === 'error_email') {
                const isEmailValid = await registrationPage.emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
                
                expect(isEmailValid, `Email validation should fail for input: "${record.email}"`).toBeFalsy();
            }
        });
    }
});