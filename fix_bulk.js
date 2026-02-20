/* eslint-disable */
const fs = require('fs');

const path =
  '/home/nadhil/xerocare/frontend/components/ManagerDashboardComponents/spareParts/BulkSparePartDialog.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add item_code to interface
content = content.replace(
  /interface BulkSparePartRow \{/,
  'interface BulkSparePartRow {\n  item_code: string;',
);

// 2. Change interface LotModelOption to LotSparePartOption
content = content.replace(
  /\/\*\* A model option derived from the selected lot's spare part items \*\/\ninterface LotModelOption \{\n  modelId: string;\n  modelName: string;\n  modelNo: string;\n  label: string; \/\/ "ModelName \(ModelNo\)"\n\}/,
  `/** A spare part option derived from the selected lot's spare part items */
interface LotSparePartOption {
  itemCode: string;
  partName: string;
  brand: string;
  modelId: string;
  basePrice: number;
  label: string; // "itemCode - partName"
}`,
);

// 3. Rename states
content = content.replace(
  /const \[lotModelOptions, setLotModelOptions\] = useState<LotModelOption\[\]>\(\[\]\);/g,
  'const [lotSparePartOptions, setLotSparePartOptions] = useState<LotSparePartOption[]>([]);',
);

content = content.replace(/setLotModelOptions\(\[\]\);/g, 'setLotSparePartOptions([]);');

// 4. Update the handleLotSelect loop
content = content.replace(
  /\/\/ Collect unique models from spare part items in this lot[\s\S]*?setLotModelOptions\(Array\.from\(modelMap\.values\(\)\)\);/,
  `// Collect unique spare parts from spare part items in this lot
    const sparePartMap = new Map<string, LotSparePartOption>();
    lot.items
      .filter((item) => item.itemType === LotItemType.SPARE_PART && item.sparePart)
      .forEach((item) => {
        const sp = item.sparePart!;
        if (sp.item_code && !sparePartMap.has(sp.item_code)) {
          sparePartMap.set(sp.item_code, {
            itemCode: sp.item_code,
            partName: sp.part_name,
            brand: sp.brand,
            modelId: sp.model_id || '',
            basePrice: item.unitPrice || sp.base_price,
            label: \`\${sp.item_code} - \${sp.part_name}\`,
          });
        }
      });

    setLotSparePartOptions(Array.from(sparePartMap.values()));`,
);

// 5. Update createEmptyRow
content = content.replace(
  /const createEmptyRow = \(\): Partial<BulkSparePartRow> => \(\{/,
  `const createEmptyRow = (): Partial<BulkSparePartRow> => ({
    item_code: '',`,
);

// 6. Update parseExcelData
const parseExcelFrom = `      const rawModel = getVal([
        'model_id',
        'Model ID',
        'Model',
        'Compatible Model',
        'Compatible Model',
        'Select Product from Lot',
        'Select Spare Parts from Lot',
      ]);
      const rawVendor = getVal(['vendor_id', 'Vendor ID', 'Vendor']);
      const rawWarehouse = getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']);

      let modelId = findIdByName(rawModel, []);
      if (!modelId && rawModel) {
        // Try to match by model name from the "Select Product from Lot" string which is "Name (ModelNo)"
        const match = rawModel.toString().match(/\\(\([^)]+\)\\)/);
        if (match && match[1]) {
          // Try matching against lot model options if a lot is already selected
          const found = lotModelOptions.find(
            (o) => o.modelNo.toLowerCase() === match[1].toLowerCase(),
          );
          if (found) modelId = found.modelId;
        }
        // Fall back to using the raw value (could be a UUID)
        if (!modelId) modelId = rawModel;
      }

      const lotIdFromExcel = getVal(['lot_id', 'Lot ID', 'Lot', 'lot_number']);

      return {
        part_name: getVal(['part_name', 'Item Name', 'Name', 'Part Name']),`;

const parseExcelTo = `      const rawModel = getVal(['model_id', 'Model ID', 'Model', 'Compatible Model']);
      let modelId = findIdByName(rawModel, []);
      if (!modelId && rawModel) {
        modelId = rawModel;
      }

      const rawVendor = getVal(['vendor_id', 'Vendor ID', 'Vendor']);
      const rawWarehouse = getVal(['warehouse_id', 'Warehouse ID', 'Warehouse']);

      const rawItemCode = getVal(['item_code', 'Item Code']);
      let itemCode = rawItemCode;
      const rawSelect = getVal(['Select Spare Parts from Lot', 'Select Product from Lot']);
      
      if (!itemCode && rawSelect) {
        const parts = rawSelect.toString().split(' - ');
        if (parts.length > 1) {
          itemCode = parts[0].trim();
        }
      }

      const lotIdFromExcel = getVal(['lot_id', 'Lot ID', 'Lot', 'lot_number']);

      return {
        item_code: itemCode,
        part_name: getVal(['part_name', 'Item Name', 'Name', 'Part Name']),`;

// Regex-based replace to avoid exact spacing mismatch on from
content = content.replace(
  /const rawModel = getVal\(\[\s*'model_id',\s*'Model ID',\s*'Model',\s*'Compatible Model',\s*'Compatible Model',\s*'Select Product from Lot',\s*'Select Spare Parts from Lot',\s*\]\);[\s\S]*?part_name: getVal\(\['part_name', 'Item Name', 'Name', 'Part Name'\]\),/m,
  parseExcelTo,
);

// 7. Update validRows filter
content = content.replace(
  /const validRows = rows\.filter\(\(r\) => r\.part_name\);/,
  `const validRows = rows.filter((r) => r.part_name && r.item_code);`,
);

content = content.replace(
  /toast\.error\('Please add at least one valid spare part'\);/,
  `toast.error('Please add at least one valid spare part with Item Code and Name');`,
);

// 8. Update UI info text
content = content.replace(
  /\{lotModelOptions\.length > 0 \? \(/,
  `{lotSparePartOptions.length > 0 ? (`,
);

content = content.replace(
  /✓ \{lotModelOptions\.length\} model\(s\) available from this lot:\{' '\}/,
  `✓ {lotSparePartOptions.length} part(s) available from this lot:{' '}`,
);

content = content.replace(
  /\{lotModelOptions\.map\(\(o\) => o\.label\)\.join\(', '\)\}/,
  `{lotSparePartOptions.map((o) => o.label).join(', ')}`,
);

// 9. Add Item Code to Table Header
content = content.replace(
  /<TableHead className="w-\[150px\]">\s*Part Name <span className="text-red-500">\*<\/span>\s*<\/TableHead>/m,
  `<TableHead className="w-[120px]">
                    Item Code <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    Part Name <span className="text-red-500">*</span>
                  </TableHead>`,
);

// 10. Add Item Code column Input
content = content.replace(
  /<TableCell>\s*<Input\s*value=\{row\.part_name\}\s*onChange=\{\(e\) => updateRow\(i, 'part_name', e\.target\.value\)\}\s*placeholder="Name"\s*\/>\s*<\/TableCell>/m,
  `<TableCell>
                      <Input
                        value={row.item_code}
                        onChange={(e) => updateRow(i, 'item_code', e.target.value)}
                        placeholder="Code"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.part_name}
                        onChange={(e) => updateRow(i, 'part_name', e.target.value)}
                        placeholder="Name"
                      />
                    </TableCell>`,
);

// 11. Update Select Spare Parts from Lot logic
content = content.replace(
  /<Select\s*value=\{row\.model_id \|\| 'universal'\}\s*onValueChange=\{\(v\) => updateRow\(i, 'model_id', v === 'universal' \? '' : v\)\}\s*>/m,
  `<Select
                        value={row.item_code || ''}
                        onValueChange={(v) => {
                          const opt = lotSparePartOptions.find(o => o.itemCode === v);
                          if (opt) {
                            updateRow(i, 'item_code', opt.itemCode);
                            updateRow(i, 'part_name', opt.partName);
                            updateRow(i, 'brand', opt.brand);
                            updateRow(i, 'model_id', opt.modelId);
                            updateRow(i, 'base_price', opt.basePrice);
                          } else {
                            updateRow(i, 'item_code', v);
                          }
                        }}
                      >`,
);

content = content.replace(
  /<SelectValue placeholder="Universal" \/>/m,
  `<SelectValue placeholder="Select Part" />`,
);

content = content.replace(
  /<SelectItem value="universal">Universal \(no model\)<\/SelectItem>/m,
  `<SelectItem value="__none__" disabled>Select from lot to auto-fill</SelectItem>`,
);

content = content.replace(
  /lotModelOptions\.length > 0\s*\?\s*lotModelOptions\.map\(\(opt\) => \(\s*<SelectItem key=\{opt\.modelId\} value=\{opt\.modelId\}>\s*\{opt\.label\}\s*<\/SelectItem>\s*\)\)/m,
  `lotSparePartOptions.length > 0 ? lotSparePartOptions.map((opt) => (
                                <SelectItem key={opt.itemCode} value={opt.itemCode}>
                                  {opt.label}
                                </SelectItem>
                              ))`,
);

content = content.replace(
  /\{selectedLotId \? 'No models in this lot' : 'Select a lot first'\}/m,
  `{selectedLotId ? 'No spare parts in this lot' : 'Select a lot first'}`,
);

fs.writeFileSync(path, content);
console.log('Fixed dialog successfully!');
