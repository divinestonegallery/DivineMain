const fs = require('fs');
const path = require('path');

const replacements = [
    { from: /@\/features\/admin/g, to: '@/components/Admin' },
    { from: /@\/features\/auth/g, to: '@/components/Auth' },
    { from: /@\/features\/catalog/g, to: '@/components/Catalog' },
    { from: /@\/features\/checkout/g, to: '@/components/Checkout' },
    { from: /@\/features\/cms/g, to: '@/components/CMS' },
    { from: /@\/features\/commissions/g, to: '@/components/Commissions' },
    { from: /@\/features\/contact/g, to: '@/components/Contact' },
    { from: /@\/features\/custom-murti/g, to: '@/components/CustomMurti' },
    { from: /@\/features\/customer/g, to: '@/components/Customer' },
    { from: /@\/features\/guides/g, to: '@/components/Guides' },
    { from: /@\/features\/uploads/g, to: '@/components/Uploads' },
    { from: /@\/features\//g, to: '@/components/' },
    { from: /@\/components\/site/g, to: '@/components/common' },
    { from: /@\/auth([\/'"])/g, to: '@/api/auth$1' },
    { from: /@\/catalog([\/'"])/g, to: '@/api/catalog$1' },
    { from: /@\/checkout([\/'"])/g, to: '@/api/checkout$1' },
    { from: /@\/cms([\/'"])/g, to: '@/api/cms$1' },
    { from: /@\/collections([\/'"])/g, to: '@/api/collections$1' },
    { from: /@\/commerce([\/'"])/g, to: '@/api/commerce$1' },
    { from: /@\/commissions([\/'"])/g, to: '@/api/commissions$1' },
    { from: /@\/messaging([\/'"])/g, to: '@/api/messaging$1' },
    { from: /@\/payments([\/'"])/g, to: '@/api/payments$1' },
    { from: /@\/security([\/'"])/g, to: '@/api/security$1' },
    { from: /@\/services([\/'"])/g, to: '@/api/services$1' },
    { from: /@\/shipping([\/'"])/g, to: '@/api/shipping$1' },
    { from: /@\/storage([\/'"])/g, to: '@/api/storage$1' },
    { from: /@\/admin([\/'"])/g, to: '@/api/admin$1' },
    { from: /@\/config([\/'"])/g, to: '@/src/config$1' },
    { from: /@\/types([\/'"])/g, to: '@/src/types$1' },
    { from: /@\/app\/chatgpt-auth/g, to: '@/api/chatgpt-auth' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else {
            const ext = path.extname(fullPath);
            if (['.ts', '.tsx', '.js', '.jsx', '.css', '.mjs'].includes(ext)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let newContent = content;
                
                for (const r of replacements) {
                    newContent = newContent.replace(r.from, r.to);
                }
                
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Updated imports in ${fullPath}`);
                }
            }
        }
    }
}

processDirectory(process.cwd());
console.log('Done fixing imports.');
