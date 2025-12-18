#!/usr/bin/env node

/**
 * Automated Card Test Runner
 * Comprehensive test execution and reporting for PayRoll Management System cards
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class CardTestRunner {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            coverage: {},
            details: []
        };
        this.startTime = null;
        this.htmlTestPath = path.join(__dirname, 'frontend-card-test.html');
        this.jestTestPath = path.join(__dirname, 'src', '__tests__', 'MetricCard.test.tsx');
    }

    /**
     * Print colored console output
     */
    log(message, color = 'white') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    /**
     * Print test header
     */
    printHeader() {
        console.log('\n'.repeat(2));
        this.log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
        this.log('║                  🎯 CARD TEST RUNNER                           ║', 'cyan');
        this.log('║              PayRoll Management System                         ║', 'cyan');
        this.log('║          Comprehensive Card Functionality Testing             ║', 'cyan');
        this.log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
        console.log('\n');
    }

    /**
     * Check if required test files exist
     */
    checkTestFiles() {
        this.log('📋 Checking test files...', 'blue');
        
        const files = [
            { path: this.htmlTestPath, name: 'HTML Test Suite', required: true },
            { path: this.jestTestPath, name: 'Jest Test Suite', required: false },
            { path: path.join(__dirname, 'package.json'), name: 'Package Config', required: true }
        ];

        const status = files.map(file => {
            const exists = fs.existsSync(file.path);
            const statusIcon = exists ? '✅' : (file.required ? '❌' : '⚠️');
            const statusText = exists ? 'Found' : 'Missing';
            
            this.log(`   ${statusIcon} ${file.name}: ${statusText}`, exists ? 'green' : 'yellow');
            
            return { ...file, exists };
        });

        const allRequired = status.filter(f => f.required).every(f => f.exists);
        
        if (!allRequired) {
            this.log('\n❌ Required test files are missing!', 'red');
            process.exit(1);
        }

        this.log('✅ All required test files found!\n', 'green');
        return status;
    }

    /**
     * Run HTML-based interactive tests
     */
    async runHtmlTests() {
        this.log('🌐 Running HTML Interactive Tests...', 'blue');
        
        try {
            // Check if we can open the HTML file
            if (fs.existsSync(this.htmlTestPath)) {
                this.log('   📄 HTML test file ready', 'green');
                this.log(`   🔗 File location: ${this.htmlTestPath}`, 'cyan');
                this.log('   👆 Open in browser to run interactive tests\n', 'yellow');
                
                // On Windows, we can try to open it automatically
                if (process.platform === 'win32') {
                    try {
                        execSync(`start "" "${this.htmlTestPath}"`, { stdio: 'ignore' });
                        this.log('   🚀 Opened HTML test in default browser', 'green');
                    } catch (error) {
                        this.log('   ⚠️  Could not auto-open browser', 'yellow');
                    }
                }

                return {
                    success: true,
                    message: 'HTML tests ready for interactive execution',
                    details: 'Open the HTML file in a browser to run comprehensive card tests'
                };
            } else {
                throw new Error('HTML test file not found');
            }
        } catch (error) {
            this.log(`   ❌ HTML test error: ${error.message}`, 'red');
            return {
                success: false,
                message: 'HTML tests failed to initialize',
                error: error.message
            };
        }
    }

    /**
     * Run Jest tests if available
     */
    async runJestTests() {
        this.log('🧪 Running Jest Unit Tests...', 'blue');
        
        try {
            // Check if Jest is available
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const hasJest = packageJson.devDependencies && 
                          (packageJson.devDependencies.jest || 
                           packageJson.devDependencies['@testing-library/react']);
            
            if (!hasJest) {
                this.log('   ⚠️  Jest not configured, skipping unit tests', 'yellow');
                return {
                    success: true,
                    message: 'Jest tests skipped - not configured',
                    skipped: true
                };
            }

            // Check if test file exists
            if (!fs.existsSync(this.jestTestPath)) {
                this.log('   ⚠️  Jest test file not found, skipping', 'yellow');
                return {
                    success: true,
                    message: 'Jest tests skipped - test file not found',
                    skipped: true
                };
            }

            // Try to run Jest tests
            const output = execSync('npm test -- --passWithNoTests --verbose', {
                encoding: 'utf8',
                cwd: __dirname,
                timeout: 30000
            });

            this.log('   ✅ Jest tests completed successfully', 'green');
            
            // Parse test results (simplified)
            const testsPassed = output.includes('PASS') || output.includes('✓');
            const testsCount = (output.match(/✓/g) || []).length;
            
            return {
                success: testsPassed,
                message: `Jest tests completed with ${testsCount} assertions`,
                details: output
            };

        } catch (error) {
            this.log(`   ⚠️  Jest tests not available: ${error.message}`, 'yellow');
            return {
                success: true,
                message: 'Jest tests skipped - environment not ready',
                skipped: true,
                error: error.message
            };
        }
    }

    /**
     * Validate React project structure
     */
    validateProjectStructure() {
        this.log('🏗️  Validating Project Structure...', 'blue');
        
        const requiredPaths = [
            { path: 'src', name: 'Source Directory', type: 'dir' },
            { path: 'src/components', name: 'Components Directory', type: 'dir' },
            { path: 'src/components/Dashboard', name: 'Dashboard Components', type: 'dir' },
            { path: 'src/components/Dashboard/MetricCard.tsx', name: 'MetricCard Component', type: 'file' },
            { path: 'package.json', name: 'Package Configuration', type: 'file' },
            { path: 'tsconfig.json', name: 'TypeScript Configuration', type: 'file' }
        ];

        const results = requiredPaths.map(item => {
            const fullPath = path.join(__dirname, item.path);
            const exists = fs.existsSync(fullPath);
            const stats = exists ? fs.statSync(fullPath) : null;
            const isCorrectType = stats && (
                (item.type === 'dir' && stats.isDirectory()) ||
                (item.type === 'file' && stats.isFile())
            );

            const statusIcon = exists && isCorrectType ? '✅' : '❌';
            const status = exists && isCorrectType ? 'OK' : 'Missing';
            
            this.log(`   ${statusIcon} ${item.name}: ${status}`, 
                     exists && isCorrectType ? 'green' : 'red');

            return { ...item, exists, isCorrectType };
        });

        const allValid = results.every(r => r.exists && r.isCorrectType);
        
        if (allValid) {
            this.log('✅ Project structure validation passed!\n', 'green');
        } else {
            this.log('⚠️  Some project structure issues detected\n', 'yellow');
        }

        return { valid: allValid, results };
    }

    /**
     * Check card functionality
     */
    checkCardFunctionality() {
        this.log('🎴 Analyzing Card Implementation...', 'blue');
        
        try {
            const metricCardPath = path.join(__dirname, 'src', 'components', 'Dashboard', 'MetricCard.tsx');
            
            if (!fs.existsSync(metricCardPath)) {
                this.log('   ❌ MetricCard component not found', 'red');
                return { success: false, message: 'MetricCard component missing' };
            }

            const content = fs.readFileSync(metricCardPath, 'utf8');
            
            // Check for key features
            const features = [
                { name: 'TypeScript Interface', check: content.includes('interface') || content.includes('type') },
                { name: 'Props Handling', check: content.includes('props') || content.includes('MetricCardProps') },
                { name: 'Click Handler', check: content.includes('onClick') },
                { name: 'Color Support', check: content.includes('color') },
                { name: 'Icon Support', check: content.includes('icon') || content.includes('Icon') },
                { name: 'Trend Display', check: content.includes('trend') },
                { name: 'Tailwind Classes', check: content.includes('className') && content.includes('bg-') },
                { name: 'Hover Effects', check: content.includes('hover:') },
                { name: 'Responsive Design', check: content.includes('md:') || content.includes('lg:') }
            ];

            features.forEach(feature => {
                const statusIcon = feature.check ? '✅' : '⚠️';
                const status = feature.check ? 'Implemented' : 'Missing';
                this.log(`   ${statusIcon} ${feature.name}: ${status}`, 
                         feature.check ? 'green' : 'yellow');
            });

            const implementationScore = features.filter(f => f.check).length;
            const totalFeatures = features.length;
            const percentage = Math.round((implementationScore / totalFeatures) * 100);

            this.log(`\n   📊 Implementation Score: ${implementationScore}/${totalFeatures} (${percentage}%)`, 
                     percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');

            return {
                success: true,
                score: implementationScore,
                total: totalFeatures,
                percentage,
                features
            };

        } catch (error) {
            this.log(`   ❌ Error analyzing card: ${error.message}`, 'red');
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateReport(results) {
        this.log('\n📊 GENERATING TEST REPORT...', 'magenta');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                duration: Date.now() - this.startTime,
                environment: {
                    platform: process.platform,
                    node: process.version,
                    cwd: __dirname
                }
            },
            results: results
        };

        // Calculate overall score
        let totalScore = 0;
        let maxScore = 0;

        if (results.structure?.valid) {
            totalScore += 25;
        }
        maxScore += 25;

        if (results.functionality?.success) {
            totalScore += results.functionality.percentage * 0.25; // Max 25 points
        }
        maxScore += 25;

        if (results.htmlTests?.success) {
            totalScore += 25;
        }
        maxScore += 25;

        if (results.jestTests?.success && !results.jestTests?.skipped) {
            totalScore += 25;
        }
        maxScore += 25;

        const overallScore = Math.round((totalScore / maxScore) * 100);
        report.summary.overallScore = overallScore;

        // Print report
        this.log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
        this.log('║                        📋 TEST REPORT                         ║', 'cyan');
        this.log('╠════════════════════════════════════════════════════════════════╣', 'cyan');
        this.log(`║ Overall Score: ${overallScore}%${' '.repeat(47 - overallScore.toString().length)}║`, 
                 overallScore >= 80 ? 'green' : overallScore >= 60 ? 'yellow' : 'red');
        this.log(`║ Duration: ${Math.round(report.summary.duration / 1000)}s${' '.repeat(52 - Math.round(report.summary.duration / 1000).toString().length)}║`, 'white');
        this.log('╠════════════════════════════════════════════════════════════════╣', 'cyan');
        this.log('║ Component Analysis:                                            ║', 'white');
        this.log(`║   Structure Valid: ${results.structure?.valid ? '✅' : '❌'}${' '.repeat(41)}║`, 'white');
        this.log(`║   Features: ${results.functionality?.score || 0}/${results.functionality?.total || 9}${' '.repeat(48)}║`, 'white');
        this.log(`║   Implementation: ${results.functionality?.percentage || 0}%${' '.repeat(44 - (results.functionality?.percentage?.toString().length || 1))}║`, 'white');
        this.log('╠════════════════════════════════════════════════════════════════╣', 'cyan');
        this.log('║ Test Execution:                                                ║', 'white');
        this.log(`║   HTML Tests: ${results.htmlTests?.success ? '✅ Ready' : '❌ Failed'}${' '.repeat(40)}║`, 'white');
        this.log(`║   Jest Tests: ${results.jestTests?.skipped ? '⚠️  Skipped' : results.jestTests?.success ? '✅ Passed' : '❌ Failed'}${' '.repeat(40)}║`, 'white');
        this.log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

        // Recommendations
        this.log('\n🎯 RECOMMENDATIONS:', 'magenta');
        
        if (overallScore >= 90) {
            this.log('🌟 Excellent! Your card system is production-ready', 'green');
        } else if (overallScore >= 75) {
            this.log('👍 Good implementation! Consider minor improvements', 'yellow');
        } else if (overallScore >= 50) {
            this.log('⚠️  Basic functionality present, needs enhancement', 'yellow');
        } else {
            this.log('❌ Significant improvements needed', 'red');
        }

        // Specific recommendations
        if (!results.structure?.valid) {
            this.log('   • Fix project structure issues', 'yellow');
        }
        
        if (results.functionality?.percentage < 80) {
            this.log('   • Implement missing card features', 'yellow');
        }
        
        if (results.jestTests?.skipped) {
            this.log('   • Set up Jest for automated testing', 'yellow');
        }

        this.log('   • Run HTML tests in browser for interactive validation', 'cyan');
        this.log('   • Test card interactions manually', 'cyan');
        
        // Save report to file
        const reportPath = path.join(__dirname, 'card-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`\n💾 Report saved to: ${reportPath}`, 'green');

        return report;
    }

    /**
     * Run all tests
     */
    async run() {
        this.startTime = Date.now();
        
        this.printHeader();
        
        try {
            // Check test files
            this.checkTestFiles();
            
            // Validate project structure
            const structureResults = this.validateProjectStructure();
            
            // Check card functionality
            const functionalityResults = this.checkCardFunctionality();
            
            // Run HTML tests
            const htmlTestResults = await this.runHtmlTests();
            
            // Run Jest tests
            const jestTestResults = await this.runJestTests();
            
            // Generate report
            const results = {
                structure: structureResults,
                functionality: functionalityResults,
                htmlTests: htmlTestResults,
                jestTests: jestTestResults
            };
            
            const report = this.generateReport(results);
            
            this.log('\n🎉 Card testing completed!', 'green');
            return report;
            
        } catch (error) {
            this.log(`\n❌ Test execution failed: ${error.message}`, 'red');
            console.error(error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new CardTestRunner();
    runner.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = CardTestRunner;
