import { WORD_LIMITS } from './constants.js';
import { escapeRegex, countWords, stripQuotes, normalizeMeCommand } from './utils.js';
import { ValidationError } from './errors.js';

export class ResponseSanitizer {
    static clean(text) {
        if (typeof text !== 'string') return '';
        return stripQuotes(
            text
                .replace(/\r\n/g, '\n')
                .replace(/\u0000/g, '')
                .trim()
        );
    }

    static ensureMeCommand(text) {
        return normalizeMeCommand(ResponseSanitizer.clean(text));
    }
}

export class Validator {
    static required(value, label) {
        if (value === null || value === undefined || value === '') {
            throw new ValidationError(`${label} is required`);
        }
        return value;
    }

    static model(model) {
        return Validator.required(model, 'Model');
    }

    static text(value, label) {
        const text = Validator.required(value, label);
        if (!text.trim()) {
            throw new ValidationError(`${label} is empty`);
        }
        return text;
    }
}

export class RoleplayValidator {
    static validate(output, { lengthMode, subjectName }) {
        const words = countWords(output);
        const limits = WORD_LIMITS[lengthMode];
        if (words < limits.min) {
            return { valid: false, reason: `Too short (${words})` };
        }
        if (words > limits.max) {
            return { valid: false, reason: `Too long (${words})` };
        }
        //if (subjectName && this.#containsSubjectEmotion(output, subjectName)) {
        //    return { valid: false, reason: 'Subject emotions detected' };
        //}
        return { valid: true, reason: '' };
    }

    static #containsSubjectEmotion(output, subjectName) {
        const emotions = [
            'happy', 'sad', 'angry', 'afraid', 'anxious', 'nervous',
            'worried', 'excited', 'upset', 'calm', 'joyful', 'depressed',
            'furious', 'relieved', 'embarrassed'
        ];
        const subject = escapeRegex(subjectName);
        const regex = new RegExp(`${subject}.{0,60}\\b(${emotions.join('|')})\\b`, 'i');
        return regex.test(output);
    }
}

