import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';

console.log('🚀 Starting deployment process...\n');

// 1. 检查 dist 目录是否存在
if (!existsSync('dist')) {
  console.error('❌ Build directory "dist" not found. Build may have failed.');
  process.exit(1);
}

// 2. 检查是否在正确的分支
let currentBranch;
try {
  currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  if (currentBranch !== 'master') {
    console.log(`⚠️  You are on branch "${currentBranch}", but deployment should be from "master" branch.`);
    console.log('   Please switch to master branch first:\n');
    console.log('   git checkout master\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking git branch:', error.message);
  process.exit(1);
}

// 3. 检查是否有未提交的更改
let hasChanges = false;
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  hasChanges = status.trim().length > 0;
  if (hasChanges) {
    console.log('📝 Found uncommitted changes:');
    console.log(status);
  }
} catch (error) {
  console.error('❌ Error checking git status:', error.message);
  process.exit(1);
}

// 4. 如果有更改，自动提交
if (hasChanges) {
  console.log('\n📦 Staging changes...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    const commitMessage = `Deploy to GitHub Pages - ${new Date().toLocaleString()}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ Changes committed successfully.\n');
  } catch (error) {
    console.error('❌ Error committing changes:', error.message);
    process.exit(1);
  }
}

// 5. 检查是否与远程同步
let needsPush = false;
try {
  execSync('git fetch origin', { stdio: 'ignore' });
  const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  let remoteCommit;
  try {
    remoteCommit = execSync('git rev-parse origin/master', { encoding: 'utf-8' }).trim();
  } catch (error) {
    // 远程分支不存在，需要推送
    remoteCommit = null;
  }
  
  if (!remoteCommit || localCommit !== remoteCommit) {
    needsPush = true;
  }
} catch (error) {
  // 如果无法获取远程信息，假设需要推送
  needsPush = true;
}

// 6. 推送到 GitHub
if (needsPush) {
  console.log('📤 Pushing to GitHub...');
  try {
    execSync('git push origin master', { stdio: 'inherit' });
    console.log('✅ Pushed to GitHub successfully!\n');
  } catch (error) {
    console.error('❌ Error pushing to GitHub:', error.message);
    console.log('\n💡 You may need to push manually:');
    console.log('   git push origin master\n');
    process.exit(1);
  }
} else {
  console.log('✅ Local branch is already in sync with remote.');
  console.log('ℹ️  No push needed. If you want to trigger a new deployment,');
  console.log('   you can manually trigger it in GitHub Actions:\n');
  console.log('   https://github.com/xoxott/ChameleonChat/actions\n');
}

// 7. 完成提示
console.log('🎉 Deployment process completed!');
console.log('\n📋 Next steps:');
console.log('   1. GitHub Actions will automatically build and deploy');
console.log('   2. Check deployment status at:');
console.log('      https://github.com/xoxott/ChameleonChat/actions');
console.log('   3. Once deployed, your site will be available at:');
console.log('      https://xoxott.github.io/ChameleonChat/\n');
