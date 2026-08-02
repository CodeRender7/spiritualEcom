import fs from 'node:fs';

const filePath = "C:/Users/raj90/.lbdb/extension/0.18.1/win_amd64/fts/libfts.lbug_extension";
const buffer = fs.readFileSync(filePath);

// PE signature starts at offset specified at 0x3c
const peOffset = buffer.readUInt32LE(0x3c);
const peSign = buffer.toString('ascii', peOffset, peOffset + 4);
if (peSign !== 'PE\0\0') {
  console.error("Not a PE file:", peSign);
  process.exit(1);
}

// COFF header starts right after PE signature
const numSections = buffer.readUInt16LE(peOffset + 6);
const optHeaderOffset = peOffset + 24;
const magic = buffer.readUInt16LE(optHeaderOffset);

let importDirOffset = 0;
let importDirSize = 0;

if (magic === 0x10b) { // PE32
  importDirOffset = buffer.readUInt32LE(optHeaderOffset + 96);
  importDirSize = buffer.readUInt32LE(optHeaderOffset + 100);
} else if (magic === 0x20b) { // PE32+
  importDirOffset = buffer.readUInt32LE(optHeaderOffset + 112);
  importDirSize = buffer.readUInt32LE(optHeaderOffset + 116);
}

console.log("Magic:", magic === 0x20b ? "PE32+" : "PE32");
console.log("Num sections:", numSections);
console.log("Import Directory RVA:", importDirOffset.toString(16));
console.log("Import Directory Size:", importDirSize);

// Helper to convert RVA to file offset
const sectionHeaderOffset = optHeaderOffset + (magic === 0x20b ? 240 : 224);
const sections = [];
for (let i = 0; i < numSections; i++) {
  const offset = sectionHeaderOffset + i * 40;
  const name = buffer.toString('ascii', offset, offset + 8).replace(/\0/g, '');
  const virtualSize = buffer.readUInt32LE(offset + 8);
  const virtualAddress = buffer.readUInt32LE(offset + 12);
  const sizeOfRawData = buffer.readUInt32LE(offset + 16);
  const pointerToRawData = buffer.readUInt32LE(offset + 20);
  sections.push({ name, virtualSize, virtualAddress, sizeOfRawData, pointerToRawData });
}

function rvaToOffset(rva) {
  for (const sec of sections) {
    if (rva >= sec.virtualAddress && rva < sec.virtualAddress + sec.virtualSize) {
      return sec.pointerToRawData + (rva - sec.virtualAddress);
    }
  }
  return 0;
}

const importTableOffset = rvaToOffset(importDirOffset);
if (importTableOffset === 0) {
  console.log("No import table found.");
} else {
  let idx = 0;
  while (true) {
    const entryOffset = importTableOffset + idx * 20;
    const lookupTableRva = buffer.readUInt32LE(entryOffset);
    const nameRva = buffer.readUInt32LE(entryOffset + 12);
    if (lookupTableRva === 0 && nameRva === 0) break;
    
    const nameFileOffset = rvaToOffset(nameRva);
    if (nameFileOffset !== 0) {
      let name = "";
      let j = nameFileOffset;
      while (buffer[j] !== 0) {
        name += String.fromCharCode(buffer[j]);
        j++;
      }
      console.log("Imported DLL:", name);
    }
    idx++;
  }
}
