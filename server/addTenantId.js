const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'server', 'models');

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'Tenant.js' && f !== 'User.js');

let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Insert tenantId field right before timestamps (in the schema definition)
    // Look for `  },` \n `  { timestamps: true }`

    if (!content.includes('tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant"')) {
        // match the end of schema fields
        const schemaEndRegex = /,\s*deletedAt:\s*{\s*type:\s*Date,\s*default:\s*null\s*},?\s*},/g;
        if (schemaEndRegex.test(content)) {
            content = content.replace(schemaEndRegex, ',\n    deletedAt: { type: Date, default: null },\n    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },\n  },');
        } else if (content.includes('timestamps: true')) {
            // rough fallback
            content = content.replace(/},\s*{\s*timestamps:\s*true/g, '  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },\n  },\n  { timestamps: true');
        }
    }

    // Remove generic unique constraints
    content = content.replace(/,\s*unique:\s*true/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
    updatedFiles++;
}

console.log(`Updated ${updatedFiles} files to include tenantId.`);
