const config = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.test.ts'],
	moduleNameMapper: {
		'^@/(.*)\\.js$': '<rootDir>/src/$1.ts',
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	transform: {
		'^.+\\.[tj]s$': [
			'babel-jest',
			{
				configFile: './babel.config.cjs',
			},
		],
	},
};

export default config;
