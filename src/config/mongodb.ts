import { connect } from 'mongoose';
import { Logger } from '../utils/logger';

export const connectToDatabase = async () => {
	const mongoDbSrv = process.env.MONGODB_SRV;

	if (!mongoDbSrv) {
		throw new Error('MONGODB_SRV is not defined in the environment variables.');
	}

	try {
		await connect(mongoDbSrv, {
			maxPoolSize: 5,
			connectTimeoutMS: 30000,
			socketTimeoutMS: 90000,
			family: 4,
			serverSelectionTimeoutMS: 30000,
			heartbeatFrequencyMS: 1500,
		});
		Logger.info('Connected to the MongoDB database successfully.');
	} catch (error) {
		Logger.error(`Failed to connect to the MongoDB database: ${error}`);
	}
};
