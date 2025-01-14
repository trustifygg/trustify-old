// biome-ignore lint/suspicious/noConsole: logger
import { inspect } from 'node:util';

import { date } from '@imranbarbhuiya/duration';
import { envParseBoolean } from '@skyra/env-utilities';
import { blue, bold, cyan, green, magenta, red, yellow } from 'colorette';
import chalk from 'chalk';

const colorDebugLog = (str: string) => {
	if (!str.startsWith('[')) return bold(str);
	const split = str.split(']');
	const shard = split.shift();
	const rest = split.join(']');
	return `${cyan(bold(`${shard}]`))} | ${bold(`${rest}`)}`;
};

export class Logger extends null {
	public static debug(msg: unknown, ...args: unknown[]) {
		if (Bun.env.DOTENV_DEBUG) {
			console.log(Logger.currentDate(), blue('[DEBUG]'), '|', msg, ...args);
		}
	}

	public static djsDebug(msg: string) {
		console.log(Logger.currentDate(), blue('[DEBUG]'), '|', colorDebugLog(msg));
	}

	public static info(msg: unknown) {
		console.log(Logger.currentDate(), blue('[INFO]'), '|', green(this.inspectMessage(msg)));
	}

	public static warn(msg: unknown) {
		console.warn(Logger.currentDate(), blue('[WARN]'), '|', yellow(this.inspectMessage(msg)));
	}

	public static error(msg: unknown, ...args: unknown[]) {
		console.error(
			chalk.red('[ERROR]'),
			chalk.red(new Date().toLocaleString()),
			msg instanceof Error ? inspect(msg) : red(msg as string),
			...args
		);
	}

	private static currentDate() {
		return `| ${magenta(date(Date.now(), 'DDD, dd MMM yyyy  HH:mm:ss'))} |`;
	}

	private static inspectMessage(msg: unknown) {
		return typeof msg === 'string' ? msg : inspect(msg);
	}
}
