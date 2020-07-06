'use strict';

const EOL = require('os').EOL;
const utils = require('./utils');

module.exports = {
	empty(chunk) {
		return utils.pad('', ' ', this.config.width, utils.PAD_RIGHT);
	},

	ruler(chunk) {
		return utils.pad('', this.config.ruler, this.config.width, utils.PAD_RIGHT);
	},

	text(chunk) {
		if (Array.isArray(chunk.value)) {
			// Expand array to multiple text calls with same formatting.
			return chunk.value.map((value) => {
				return this.formatters.text({ type: chunk.type, value: value, align: chunk.align, padding: chunk.padding });
			}).join(EOL);
		}

		let chars = this.config.width - (chunk.hasOwnProperty('padding') ? (chunk.hasOwnProperty('align') && chunk.align === 'center' ? chunk.padding * 2 : chunk.padding) : 0);
		let words = chunk.value.split(/\s/g);
		let lines = [];
		let line = '';

		words.reverse();

		while (words.length > 0) {
			let word = words.pop();

			if (line.length + word.length > chars) {
				lines.push(line);
				line = '';
			}

			line += word + ' ';
		}

		lines.push(line);

		let alignTypes = {
			left: utils.PAD_RIGHT,
			right: utils.PAD_LEFT,
			center: utils.PAD_BOTH
		};

		if (lines) {
			return lines.map((line) => {
				line = line.replace(/\s+$|^\s+/, '');

				if (chunk.hasOwnProperty('align')) {
					if (alignTypes.hasOwnProperty(chunk.align)) {
						return utils.pad(line, ' ', this.config.width, alignTypes[chunk.align]);
					}
				}

				return utils.pad(line, ' ', this.config.width, utils.PAD_RIGHT);
			}).join(EOL);
		}

		return '';
	},

	properties(chunk) {
		let widest = 0;

		for (let line of chunk.lines) {
			widest = Math.max(line.name.length, widest);
		}

		return chunk.lines.map((line) => utils.pad(line.name + ':', ' ', widest + 5) + line.value).join(EOL);
	},

	table(chunk) {
		let lines = [this.formatters.ruler('')];

		lines.push([
			utils.pad('Cant.', ' ', 6, utils.PAD_RIGHT),
			utils.pad('Producto', ' ', this.config.width - 24, utils.PAD_RIGHT),
			utils.pad('Precio', ' ', 6, utils.PAD_LEFT),
			utils.pad('Total', ' ', 12, utils.PAD_LEFT)
		].join(''));

		lines.push(this.formatters.ruler(''));

		for (let line of chunk.lines) {
			let total = line.qty * line.cost;

			if (line.hasOwnProperty('discount')) {
				if (line.discount.type === 'percentage') total *= (1 - line.discount.value);
				else total -= line.discount.value;
			}

			if (line.item.length < 16) {
				lines.push([
					utils.pad(line.qty, ' ', 6, utils.PAD_RIGHT),
					utils.pad(line.item.substr(0, this.config.width - 24), ' ', this.config.width - 24, utils.PAD_RIGHT),
					utils.pad("$" + (Number(line.cost) / 100), ' ', 6, utils.PAD_LEFT),
					utils.pad(this.config.currency + utils.money(total), ' ', 12, utils.PAD_LEFT)
				].join(''));
			}
			/*
			lines.push([
				utils.pad(line.qty, ' ', 6, utils.PAD_RIGHT),
				utils.pad(line.item.substr(0, this.config.width - 24), ' ', this.config.width - 24, utils.PAD_RIGHT),
				utils.pad("$" + (Number(line.cost) / 100), ' ', 6, utils.PAD_LEFT),
				utils.pad(this.config.currency + utils.money(total), ' ', 12, utils.PAD_LEFT)
			].join(''));
			*/

			let chars = this.config.width - 24;
			let words = line.item.split(/\s/g);
			let sub_line = '';

			words.reverse();

			let first_itera = true;
			let show_last_word = false;

			while (words.length > 0) {
				let word = words.pop();

				if (sub_line.length + word.length > chars) {
					show_last_word = true;
					if (first_itera) {

						lines.push([
							utils.pad(line.qty, ' ', 6, utils.PAD_RIGHT),
							utils.pad(sub_line, ' ', chars, utils.PAD_RIGHT),
							utils.pad("$" + (Number(line.cost) / 100), ' ', 6, utils.PAD_LEFT),
							utils.pad(this.config.currency + utils.money(total), ' ', 12, utils.PAD_LEFT)
						].join(''));

						first_itera = false;
					} else {
						lines.push([
							utils.pad('', ' ', 6, utils.PAD_LEFT),
							utils.pad(sub_line, ' ', chars, utils.PAD_RIGHT),
						].join(''));
					}

					sub_line = '';
				}

				sub_line += word + ' ';
			}

			if (show_last_word) {
				lines.push([
					utils.pad('', ' ', 6, utils.PAD_RIGHT),
					utils.pad(sub_line, ' ', chars, utils.PAD_RIGHT),
				].join(''));
			}


			if (line.hasOwnProperty('discount')) {
				let discountText = line.discount.hasOwnProperty('message')
					? '  (' + line.discount.message + ')'
					: '  (Desc. -' + (line.discount.type === 'percentage' ? (line.discount.value * 100).toFixed(2) + '%' : this.config.currency + utils.money(line.discount.value)) + ')';

				lines.push([
					utils.pad('', ' ', 6, utils.PAD_RIGHT),
					discountText
				].join(''));
			}

			lines.push([
				""
			].join(''));
		}

		lines.push(this.formatters.ruler(''));

		return lines.join(EOL);
	}
};