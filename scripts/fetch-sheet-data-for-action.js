          const { google } = require('googleapis');
          const fs = require('fs');

          async function fetchAllSheetData() {
            try {
              console.log('🔍 Starting Google Sheets data fetch...');

              // Validate environment variables
              if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
                throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS not set');
              }
              if (!process.env.GOOGLE_SHEET_ID) {
                throw new Error('GOOGLE_SHEET_ID not set');
              }

              // Parse inputs
              const singleSite = process.env.SINGLE_SITE ? process.env.SINGLE_SITE.trim() : '';
              const siteLimit = process.env.SITE_LIMIT ? parseInt(process.env.SITE_LIMIT, 10) : 0;
              
              console.log(`Input parameters - Single Site: "${singleSite}", Site Limit: ${siteLimit}`);

              // Setup Google Sheets API
              const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf8');
              const credentials = JSON.parse(decodedCredentials);

              const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
              });

              const sheets = google.sheets({ version: 'v4', auth });
              
              // Fetch sheet data
              console.log('📊 Fetching data from Google Sheets...');
              const response = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'wbags-scroll!A:O',
              });

              const rows = response.data.values;
              if (!rows || rows.length <= 1) {
                throw new Error('No data found in Google Sheets or only header row present');
              }

              // Save sheet data for other jobs
              const sheetData = { 
                timestamp: new Date().toISOString(), 
                runId: process.env.GITHUB_RUN_ID || 'local', 
                data: rows 
              };
              fs.writeFileSync('sheet-data.json', JSON.stringify(sheetData, null, 2));

              // Handle single site mode
              if (singleSite) {
                console.log(`🏃 Running for single site: ${singleSite}`);
                return { sites: [singleSite] };
              }

              // Process all sites with optional limit
              console.log('🔄 Processing all sites...');
              const dataRows = rows.slice(1); // Skip header row
              const sites = [];
              let sitesAdded = 0;

              for (let i = 0; i < dataRows.length; i++) {
                // Check site limit
                if (siteLimit > 0 && sitesAdded >= siteLimit) {
                  console.log(`✋ Reached site limit of ${siteLimit}`);
                  break;
                }

                const row = dataRows[i];
                const brandName = row[0];

                // Validate row data
                if (brandName && 
                    brandName.trim() && 
                    brandName.toLowerCase() !== 'brands' &&
                    brandName.trim().length > 1) {

                  
                  sites.push(brandName.trim());
                  sitesAdded++;
                  console.log(`✅ Added site: ${brandName.trim()} (${sitesAdded}/${siteLimit || 'unlimited'})`);
                } else {
                  // This block can be used for logging skipped invalid rows if needed
                }
              }

              console.log(`📝 Final sites list: ${JSON.stringify(sites)}`);
              return { sites };

            } catch (error) {
              console.error('❌ Error in fetchAllSheetData:', error.message);
              console.error('Stack trace:', error.stack);
              process.exit(1);
            }
          }

          // Execute and set outputs
          fetchAllSheetData().then(result => {
            const sitesJson = JSON.stringify(result.sites);
            const hasSites = result.sites.length > 0 ? 'true' : 'false';
            
            console.log(`Setting output - sites: ${sitesJson}`);
            console.log(`Setting output - has-sites: ${hasSites}`);
            
            // Write to GitHub outputs
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `sites=${sitesJson}\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `has-sheet-data=true\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `has-sites=${hasSites}\n`);
            
            console.log('✅ Successfully completed data fetch and matrix preparation');
          }).catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
          });
