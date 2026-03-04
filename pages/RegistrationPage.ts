import { Page, Locator, expect } from '@playwright/test';
import { RegistrationData } from '../types/RegistrationData';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export class RegistrationPage {
    readonly page: Page;

    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly emailInput: Locator;
    
    readonly genderMaleRadio: Locator;
    readonly genderFemaleRadio: Locator;
    readonly genderOtherRadio: Locator;
    
    readonly mobileInput: Locator;
    readonly dobInput: Locator;
    readonly subjectsInput: Locator;
    
    readonly hobbySportsCheckbox: Locator;
    readonly hobbyReadingCheckbox: Locator;
    readonly hobbyMusicCheckbox: Locator;
    
    readonly pictureUpload: Locator;
    readonly currentAddressTextarea: Locator;
    
    readonly stateInput: Locator;
    readonly cityInput: Locator;
    
    readonly submitButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.firstNameInput = page.locator('#firstName');
        this.lastNameInput = page.locator('#lastName');
        this.emailInput = page.locator('#userEmail');
        
        this.genderMaleRadio = page.locator('label[for="gender-radio-1"]');
        this.genderFemaleRadio = page.locator('label[for="gender-radio-2"]');
        this.genderOtherRadio = page.locator('label[for="gender-radio-3"]');
        
        this.mobileInput = page.locator('#userNumber');
        this.dobInput = page.locator('#dateOfBirthInput');
        this.subjectsInput = page.locator('#subjectsInput');
        
        this.hobbySportsCheckbox = page.locator('label[for="hobbies-checkbox-1"]');
        this.hobbyReadingCheckbox = page.locator('label[for="hobbies-checkbox-2"]');
        this.hobbyMusicCheckbox = page.locator('label[for="hobbies-checkbox-3"]');
        
        this.pictureUpload = page.locator('#uploadPicture');
        this.currentAddressTextarea = page.locator('#currentAddress');
        
        this.stateInput = page.locator('#react-select-3-input');
        this.cityInput = page.locator('#react-select-4-input');
        
        this.submitButton = page.locator('#submit');
    }

    // ==========================================
    // Actions In Registor Page
    // ==========================================

    async navigate() {
        await this.page.goto('https://demoqa.com/automation-practice-form');
    }

    async fillName(firstName: string, lastName: string) {
        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
    }

    async fillEmail(email: string) {
        await this.emailInput.fill(email);
    }

    async selectGender(gender: 'Male' | 'Female' | 'Other') {
        if (gender === 'Male') await this.genderMaleRadio.click();
        else if (gender === 'Female') await this.genderFemaleRadio.click();
        else await this.genderOtherRadio.click();
    }

    async fillMobile(mobile: string) {
        await this.mobileInput.fill(mobile);
    }

    async fillDateOfBirth(dateStr: string) {
        await this.dobInput.click();
        await this.page.keyboard.press('Control+A'); 
        await this.dobInput.fill(dateStr);
        await this.page.keyboard.press('Enter');
    }

    async addSubject(subject: string) {
        await this.subjectsInput.fill(subject);
        await this.page.keyboard.press('Tab');
    }

    async selectHobbies(hobbies: ('Sports' | 'Reading' | 'Music')[]) {
        if (hobbies.includes('Sports')) await this.hobbySportsCheckbox.click();
        if (hobbies.includes('Reading')) await this.hobbyReadingCheckbox.click();
        if (hobbies.includes('Music')) await this.hobbyMusicCheckbox.click();
    }

    async uploadProfilePicture(filePath: string) {
        await this.pictureUpload.setInputFiles(filePath);
    }

    async fillAddress(address: string) {
        await this.currentAddressTextarea.fill(address);
    }

    async selectState(state: string) {
        await this.stateInput.fill(state);
        await this.page.keyboard.press('Tab');
    }

    async selectCity(city: string) {
        await this.cityInput.fill(city);
        await this.page.keyboard.press('Tab');
    }

    async clickSubmit() {
        await this.submitButton.click();
    }

    // ==========================================
    // Check Correctly Submission 
    // ==========================================

    async verifySuccessModal(record: RegistrationData) {
        const VALID_SUBJECTS = loadValidSubjects();
        const VALID_STATE_CITY = loadValidStateCity();

        // check submit complete
        const modalTitle = this.page.locator('#example-modal-sizes-title-lg');
        await expect(modalTitle).toBeVisible();
        await expect(modalTitle).toHaveText('Thanks for submitting the form');

        // get actual data
        const getModalValue = async (labelName: string) => {
            return await this.page.locator(`xpath=//td[text()="${labelName}"]/following-sibling::td`).innerText();
        };

        // compare actual data and input data
        expect(await getModalValue('Student Name')).toBe(`${record.firstName || ''} ${record.lastName || ''}`.trim());
        expect(await getModalValue('Student Email')).toBe(record.email || '');
        expect(await getModalValue('Gender')).toBe(record.gender || '');
        expect(await getModalValue('Mobile')).toBe(record.mobile || '');
        
        // Date of birth
        if (record.dob) {
            const expectedDob = this.formatDateForModal(record.dob);
            expect(await getModalValue('Date of Birth')).toBe(expectedDob);
        }
        
        // Hobby
        let expectedHobbies = '';
        if (record.hobbies) {
            expectedHobbies = record.hobbies.replace(/\|/g, ', ');
        }
        const actualHobbies = await getModalValue('Hobbies');
        expect(actualHobbies).toBe(expectedHobbies);

        // address
        const actualAddress = await getModalValue('Address');
        expect(actualAddress).toBe(record.address || '');

        // picture
        let expectedPicture = '';
        if (record.picture) {
            // "data/images/pic.png" -> "pic.png"
            expectedPicture = record.picture.split(/[/\\]/).pop() || '';
        }
        const actualPicture = await getModalValue('Picture');
        expect(actualPicture).toBe(expectedPicture);

        // subject
        let expectedSubjects = '';
        if (record.subjects) {
            const inputSubjects = record.subjects.split('|');
            const validSubjectsOnly = inputSubjects.filter(sub => VALID_SUBJECTS.includes(sub));
            expectedSubjects = validSubjectsOnly.join(', ');
        }
        const actualSubjects = await getModalValue('Subjects');
        expect(actualSubjects).toBe(expectedSubjects);

        // state and city
        let expectedStateCity = '';
        const isValidState = record.state && VALID_STATE_CITY[record.state] !== undefined;
        const isValidCity = isValidState && record.city && VALID_STATE_CITY[record.state as string].includes(record.city);

        if (isValidState && isValidCity) {
            expectedStateCity = `${record.state} ${record.city}`;
        } else {
            expectedStateCity = '';
        }

        const actualStateCity = await getModalValue('State and City');
        expect(actualStateCity.trim()).toBe(expectedStateCity.trim());

        // Close modal
        
        // ESC
        await this.page.keyboard.press('Escape');

        try {
            // Modal should be hide in 2 sec
            await expect(modalTitle).toBeHidden({ timeout: 2000 });
        } catch (error) {
            // Refrese Page
            console.log('Bug Cannot close form');
            await this.page.reload();
            await this.page.evaluate(() => document.body.style.zoom = '0.7'); 
        }
    }

    // function
    private formatDateForModal(dateStr: string): string {
        if (!dateStr) return '';

        // spilt DD MMM YYYY -> [DD, MMM, YYYY]
        const parts = dateStr.split(' ');
        if (parts.length !== 3) return dateStr;

        const day = parts[0];
        const monthShort = parts[1];
        const year = parts[2];

        // Format Month
        const monthMap: Record<string, string> = {
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
            'Apr': 'April',   'May': 'May',      'Jun': 'June',
            'Jul': 'July',    'Aug': 'August',   'Sep': 'September',
            'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
        };

        const monthFull = monthMap[monthShort] || monthShort;

        return `${day} ${monthFull},${year}`;
    }
}

function loadValidSubjects(): string[] {
    const filePath = path.join(__dirname, '../data/master_subjects.csv');
    if (!fs.existsSync(filePath)) return [];
    
    const records = parse(fs.readFileSync(filePath, 'utf-8'), { 
        columns: true, 
        skip_empty_lines: true 
    });
    return records.map((r: any) => r.subjectName);
}

function loadValidStateCity(): Record<string, string[]> {
    const filePath = path.join(__dirname, '../data/master_state_city.csv');
    if (!fs.existsSync(filePath)) return {};

    const records = parse(fs.readFileSync(filePath, 'utf-8'), { 
        columns: true, 
        skip_empty_lines: true 
    });
    
    const map: Record<string, string[]> = {};
    for (const r of records) {
        if (!map[r.state]) {
            map[r.state] = [];
        }
        map[r.state].push(r.city);
    }
    return map;
}