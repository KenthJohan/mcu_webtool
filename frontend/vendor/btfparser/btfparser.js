const BTF_KIND = {
	0: "UNKN",
	1: "INT",
	2: "PTR",
	3: "ARRAY",
	4: "STRUCT",
	5: "UNION",
	6: "ENUM",
	7: "FWD",
	8: "TYPEDEF",
	9: "VOLATILE",
	10: "CONST",
	11: "RESTRICT",
	12: "FUNC",
	13: "FUNC_PROTO",
	14: "VAR",
	15: "DATASEC",
	16: "FLOAT",
	17: "DECL_TAG",
	18: "TYPE_TAG",
	19: "ENUM64"
};

function readCString(bytes, offset) {
	if (offset < 0 || offset >= bytes.length) {
		return "";
	}
	let end = offset;
	while (end < bytes.length && bytes[end] !== 0) {
		end += 1;
	}
	return new TextDecoder().decode(bytes.slice(offset, end));
}

function btf_parse(arrayBuffer) {
	const view = new DataView(arrayBuffer);
	const bytes = new Uint8Array(arrayBuffer);

	if (view.byteLength < 24) {
		throw new Error("File too small to be a valid BTF blob.");
	}

	const magic = view.getUint16(0, true);
	if (magic !== 0xeb9f) {
		throw new Error(`Invalid BTF magic: 0x${magic.toString(16)} (expected 0xeb9f)`);
	}

	const version = view.getUint8(2);
	const flags = view.getUint8(3);
	const hdrLen = view.getUint32(4, true);
	const typeOff = view.getUint32(8, true);
	const typeLen = view.getUint32(12, true);
	const strOff = view.getUint32(16, true);
	const strLen = view.getUint32(20, true);

	const typeStart = hdrLen + typeOff;
	const typeEnd = typeStart + typeLen;
	const strStart = hdrLen + strOff;
	const strEnd = strStart + strLen;

	if (typeEnd > view.byteLength || strEnd > view.byteLength) {
		throw new Error("BTF section boundaries exceed file length.");
	}

	const strings = bytes.slice(strStart, strEnd);
	const types = [];

	let pos = typeStart;
	let typeId = 1;

	const getString = (off) => readCString(strings, off);

	while (pos < typeEnd) {
		if (pos + 12 > typeEnd) {
			throw new Error(`Truncated type record at offset ${pos}.`);
		}

		const nameOff = view.getUint32(pos, true);
		const info = view.getUint32(pos + 4, true);
		const sizeOrType = view.getUint32(pos + 8, true);

		const vlen = info & 0xffff;
		const kind = (info >>> 24) & 0x1f;
		const kindFlag = (info >>> 31) & 0x1;

		let recPos = pos + 12;
		const record = {
			id: typeId,
			name: getString(nameOff),
			kind,
			kindName: BTF_KIND[kind] || `UNKNOWN_${kind}`,
			kindFlag,
			vlen,
			sizeOrType,
			data: {}
		};

		if (kind === 1) {
			if (recPos + 4 > typeEnd) throw new Error("Truncated INT record.");
			const encoding = view.getUint32(recPos, true);
			record.data = {
				sizeBytes: sizeOrType,
				encoding,
				bitsOffset: encoding & 0xff,
				bitSize: (encoding >>> 16) & 0xff,
				encodingFlags: (encoding >>> 24) & 0x0f
			};
			recPos += 4;
		} else if (kind === 3) {
			if (recPos + 12 > typeEnd) throw new Error("Truncated ARRAY record.");
			record.data = {
				elemType: view.getUint32(recPos, true),
				indexType: view.getUint32(recPos + 4, true),
				nelems: view.getUint32(recPos + 8, true)
			};
			recPos += 12;
		} else if (kind === 4 || kind === 5) {
			const members = [];
			for (let i = 0; i < vlen; i += 1) {
				if (recPos + 12 > typeEnd) throw new Error("Truncated STRUCT/UNION member.");
				const memberNameOff = view.getUint32(recPos, true);
				const memberType = view.getUint32(recPos + 4, true);
				const memberOffsetRaw = view.getUint32(recPos + 8, true);
				members.push({
					name: getString(memberNameOff),
					type: memberType,
					offsetBits: memberOffsetRaw,
					offsetBytes: memberOffsetRaw / 8
				});
				recPos += 12;
			}
			record.data = {
				sizeBytes: sizeOrType,
				members
			};
		} else if (kind === 6) {
			const members = [];
			for (let i = 0; i < vlen; i += 1) {
				if (recPos + 8 > typeEnd) throw new Error("Truncated ENUM member.");
				const memberNameOff = view.getUint32(recPos, true);
				const memberVal = view.getInt32(recPos + 4, true);
				members.push({ name: getString(memberNameOff), value: memberVal });
				recPos += 8;
			}
			record.data = {
				sizeBytes: sizeOrType,
				values: members
			};
		} else if (kind === 13) {
			const params = [];
			for (let i = 0; i < vlen; i += 1) {
				if (recPos + 8 > typeEnd) throw new Error("Truncated FUNC_PROTO param.");
				const paramNameOff = view.getUint32(recPos, true);
				const paramType = view.getUint32(recPos + 4, true);
				params.push({ name: getString(paramNameOff), type: paramType });
				recPos += 8;
			}
			record.data = {
				returnType: sizeOrType,
				params
			};
		} else if (kind === 14) {
			if (recPos + 4 > typeEnd) throw new Error("Truncated VAR record.");
			record.data = {
				type: sizeOrType,
				linkage: view.getUint32(recPos, true)
			};
			recPos += 4;
		} else if (kind === 15) {
			const vars = [];
			for (let i = 0; i < vlen; i += 1) {
				if (recPos + 12 > typeEnd) throw new Error("Truncated DATASEC var entry.");
				vars.push({
					type: view.getUint32(recPos, true),
					offset: view.getUint32(recPos + 4, true),
					size: view.getUint32(recPos + 8, true)
				});
				recPos += 12;
			}
			record.data = {
				sizeBytes: sizeOrType,
				vars
			};
		} else if (kind === 17) {
			if (recPos + 4 > typeEnd) throw new Error("Truncated DECL_TAG record.");
			record.data = {
				type: sizeOrType,
				componentIndex: view.getInt32(recPos, true)
			};
			recPos += 4;
		} else if (kind === 19) {
			const members = [];
			for (let i = 0; i < vlen; i += 1) {
				if (recPos + 12 > typeEnd) throw new Error("Truncated ENUM64 member.");
				const memberNameOff = view.getUint32(recPos, true);
				const lo = view.getUint32(recPos + 4, true);
				const hi = view.getInt32(recPos + 8, true);
				const value = (BigInt(hi) << 32n) | BigInt(lo >>> 0);
				members.push({ name: getString(memberNameOff), value: value.toString() });
				recPos += 12;
			}
			record.data = {
				sizeBytes: sizeOrType,
				values: members
			};
		} else {
			if (kind === 2 || kind === 7 || kind === 8 || kind === 9 || kind === 10 || kind === 11 || kind === 12 || kind === 16 || kind === 18) {
				record.data = { type: sizeOrType };
			}
		}

		types.push(record);
		pos = recPos;
		typeId += 1;
	}

	return {
		header: {
			magic: `0x${magic.toString(16)}`,
			version,
			flags,
			hdrLen,
			typeOff,
			typeLen,
			strOff,
			strLen
		},
		types
	};
}


async function btf_parse_fetch_file(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch BTF file: ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return btf_parse(arrayBuffer);
}