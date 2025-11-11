import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import cspell from '@cspell/eslint-plugin';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		plugins: {
			'@cspell': cspell,
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': 'error',

			'@typescript-eslint/no-explicit-any': 'off', // Allow 'any' type
			'@typescript-eslint/no-unsafe-assignment': 'off', // Allow assigning 'any' values
			'@typescript-eslint/no-unsafe-call': 'off', // Allow calling 'any' as function
			'@typescript-eslint/no-unsafe-member-access': 'off', // Allow accessing properties on 'any'
			'@typescript-eslint/no-unsafe-return': 'off', // Allow returning 'any'
		},
	},
	{
		files: ['src/**/*.ts'],
	}
);
