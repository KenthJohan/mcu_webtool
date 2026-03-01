
function formatBtfAsText(parsedData) {
	const types = parsedData.types;
	
	const getTypeName = (id) => {
		if (id === 0) return "void";
		const t = types[id - 1];
		if (!t) return `<type:${id}>`;
		const rawName = t.name || "";
		return rawName ? `${rawName} (id:${id})` : `${(t.kindName || "type").toLowerCase()}#${id}`;
	};

	const lines = [];
	for (const type of types) {
		const headerName = type.name ? ` ${type.name}` : "";
		lines.push(`[${type.id}] ${type.kindName}${headerName}`);

		if (type.kindName === "STRUCT" || type.kindName === "UNION") {
			lines.push(`  size: ${type.data.sizeBytes} bytes`);
			for (const member of type.data.members || []) {
				lines.push(`  - ${member.name || "<anon>"}: ${getTypeName(member.type)} @ byte ${member.offsetBytes}`);
			}
		} else if (type.kindName === "INT") {
			lines.push(`  size: ${type.data.sizeBytes} bytes, bits: ${type.data.bitSize}, bit_offset: ${type.data.bitsOffset}`);
		} else if (type.kindName === "ARRAY") {
			lines.push(`  elem: ${getTypeName(type.data.elemType)}, index: ${getTypeName(type.data.indexType)}, count: ${type.data.nelems}`);
		} else if (type.kindName === "FUNC_PROTO") {
			lines.push(`  returns: ${getTypeName(type.data.returnType)}`);
			for (const param of type.data.params || []) {
				lines.push(`  - param ${param.name || "<anon>"}: ${getTypeName(param.type)}`);
			}
		} else if (type.kindName === "VAR") {
			lines.push(`  type: ${getTypeName(type.data.type)}, linkage: ${type.data.linkage}`);
		} else if (type.kindName === "DATASEC") {
			lines.push(`  section size: ${type.data.sizeBytes}`);
			for (const entry of type.data.vars || []) {
				lines.push(`  - var: ${getTypeName(entry.type)} offset=${entry.offset} size=${entry.size}`);
			}
		} else if (type.kindName === "ENUM" || type.kindName === "ENUM64") {
			for (const item of type.data.values || []) {
				lines.push(`  - ${item.name}: ${item.value}`);
			}
		} else {
			lines.push(`  raw: ${JSON.stringify(type.data)}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

function setStatus(message, isError = false) {
	const statusEl = document.getElementById("status");
	statusEl.textContent = message;
	statusEl.className = isError ? "error" : "";
}

function renderResult(result) {
	const summaryEl = document.getElementById("summary");
	const outputEl = document.getElementById("output");

	summaryEl.innerHTML = `
		<strong>Header</strong><br>
		magic=${result.header.magic}, version=${result.header.version}, flags=${result.header.flags}<br>
		hdr_len=${result.header.hdrLen}, type_len=${result.header.typeLen}, str_len=${result.header.strLen}<br>
		<strong>Types parsed:</strong> ${result.types.length}
	`;

	const readableText = formatBtfAsText(result);
	outputEl.textContent = readableText || "No types found.";
}

async function loadDefaultBtf() {
	setStatus("Loading ./a.btf ...");
	try {
		const parsed = await btf_parse_fetch_file("./a.btf");
        console.log(parsed);
		renderResult(parsed);
		setStatus(`Loaded ./a.btf successfully (${parsed.types.length} type records).`);
	} catch (error) {
		setStatus(String(error), true);
	}
}

async function loadFromFile(file) {
	setStatus(`Loading ${file.name} ...`);
	try {
		const buffer = await file.arrayBuffer();
		const parsed = btf_parse(buffer);
        console.log(parsed);
		renderResult(parsed);
		setStatus(`Loaded ${file.name} successfully (${parsed.types.length} type records).`);
	} catch (error) {
		setStatus(String(error), true);
	}
}

document.getElementById("loadDefaultBtn").addEventListener("click", () => {
	loadDefaultBtf();
});

document.getElementById("fileInput").addEventListener("change", (event) => {
	const file = event.target.files && event.target.files[0];
	if (file) {
		loadFromFile(file);
	}
});
