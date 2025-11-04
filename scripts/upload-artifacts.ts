import { S3Uploader } from '../utils/s3-uploader.js';

// Local UploadedFile interface to avoid cross-module type import issues in ESM/ts-node build
interface UploadedFile {
  url: string;
  key: string;
  type: 'video' | 'screenshot' | 'trace' | 'report' | 'other';
  size: number;
  name: string;
}

import * as fs from 'fs';
import * as path from 'path';

async function uploadTestArtifacts() {
  try {
    const uploader = new S3Uploader();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runId = process.env.GITHUB_RUN_ID || `local-${timestamp}`;
    const s3Prefix = `test-runs/${runId}`;

    console.log('📦 Starting artifact upload to S3...');
    console.log(`Run ID: ${runId}`);
    console.log(`S3 Bucket: ${process.env.S3_BUCKET_NAME}`);

    const artifactDirs = [
      { local: 'playwright-report', s3: `${s3Prefix}/html-report` },
      { local: 'test-results', s3: `${s3Prefix}/test-results` },
    ];

    let allUploadedFiles: UploadedFile[] = [];

    for (const { local, s3 } of artifactDirs) {
      if (fs.existsSync(local)) {
        console.log(`\n📁 Uploading ${local}/...`);
        const raw = await (uploader as any).uploadDirectory(local, s3);
        const files: UploadedFile[] = (raw || []).map((item: any) => {
          if (typeof item === 'string') {
            const url = item;
            const name = url.split('/').pop() || 'file';
            const type = name.match(/\.(webm|mp4)$/i) ? 'video'
              : name.match(/\.(png|jpe?g)$/i) ? 'screenshot'
              : name.match(/trace|\.zip$/i) ? 'trace'
              : (name === 'index.html' || /report/i.test(name)) ? 'report'
              : 'other';
            return { url, key: `${s3}/${name}`, type, size: 0, name } as UploadedFile;
          }
          if (item && typeof item === 'object' && 'url' in item) {
            return item as UploadedFile;
          }
          return { url: String(item), key: '', type: 'other', size: 0, name: String(item) } as UploadedFile;
        });
        allUploadedFiles = allUploadedFiles.concat(files);
        console.log(`✓ Uploaded ${files.length} files from ${local}`);
      } else {
        console.log(`⚠ Directory not found: ${local}`);
      }
    }

    // Organize files by type
    const organizedFiles = {
      videos: allUploadedFiles.filter(f => f.type === 'video'),
      screenshots: allUploadedFiles.filter(f => f.type === 'screenshot'),
      traces: allUploadedFiles.filter(f => f.type === 'trace'),
      reports: allUploadedFiles.filter(f => f.type === 'report'),
      others: allUploadedFiles.filter(f => f.type === 'other'),
    };

    // Print summary
    console.log('\n📊 Upload Summary:');
    console.log(`   🎥 Videos: ${organizedFiles.videos.length}`);
    console.log(`   📸 Screenshots: ${organizedFiles.screenshots.length}`);
    console.log(`   🔍 Traces: ${organizedFiles.traces.length}`);
    console.log(`   📄 Reports: ${organizedFiles.reports.length}`);
    console.log(`   📦 Other files: ${organizedFiles.others.length}`);

    const totalSize = allUploadedFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`   💾 Total size: ${formatBytes(totalSize)}`);

    // Generate and upload index file with video gallery
    console.log('\n📝 Generating index page with video gallery...');
    const indexContent = generateIndexHtml(organizedFiles, runId);
    const tempDir = 'temp-index';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const indexPath = path.join(tempDir, 'index.html');
    fs.writeFileSync(indexPath, indexContent);
    await uploader.uploadFile(indexPath, `${s3Prefix}/index.html`);
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    const reportUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Prefix}/index.html`;
    
    console.log('\n✅ Upload complete!');
    console.log(`📊 View report with video gallery: ${reportUrl}`);
    console.log('\n🔗 Copy this URL to view your test results with videos\n');
    
    // List all video URLs
    if (organizedFiles.videos.length > 0) {
      console.log('🎥 Video URLs:');
      organizedFiles.videos.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.name}: ${video.url}`);
      });
    }
    
    return reportUrl;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

interface OrganizedFiles {
  videos: UploadedFile[];
  screenshots: UploadedFile[];
  traces: UploadedFile[];
  reports: UploadedFile[];
  others: UploadedFile[];
}

function generateIndexHtml(files: OrganizedFiles, runId: string): string {
  const htmlReportUrl = files.reports.find(f => f.name === 'index.html')?.url || '#';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Results - ${runId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { 
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #2d3748;
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    h2 {
      color: #2d3748;
      font-size: 1.8rem;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .meta {
      color: #718096;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .meta p { margin: 5px 0; }
    .highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }
    .highlight a {
      color: white;
      text-decoration: none;
      font-size: 1.2rem;
      font-weight: bold;
      display: inline-block;
      padding: 12px 24px;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
      transition: background 0.3s;
    }
    .highlight a:hover {
      background: rgba(255,255,255,0.3);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card h3 {
      font-size: 2.5rem;
      margin-bottom: 5px;
    }
    .stat-card p {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    
    /* Video Gallery Styles */
    .video-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 25px;
      margin: 30px 0;
    }
    .video-card {
      background: #f7fafc;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .video-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .video-card video {
      width: 100%;
      height: 250px;
      background: #000;
      object-fit: contain;
    }
    .video-info {
      padding: 15px;
    }
    .video-name {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
      font-size: 0.95rem;
      word-break: break-word;
    }
    .video-meta {
      color: #718096;
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .download-btn {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.85rem;
      display: inline-block;
      margin-top: 10px;
      transition: background 0.3s;
    }
    .download-btn:hover {
      background: #5568d3;
    }
    
    /* Screenshot Gallery */
    .screenshot-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .screenshot-card {
      background: #f7fafc;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot-card img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.3s;
    }
    .screenshot-card img:hover {
      transform: scale(1.05);
    }
    .screenshot-info {
      padding: 10px;
      font-size: 0.85rem;
      color: #4a5568;
    }
    
    /* File List Styles */
    .file-list {
      list-style: none;
      margin: 20px 0;
    }
    .file-list li {
      padding: 12px 15px;
      margin: 8px 0;
      background: #f7fafc;
      border-left: 4px solid #667eea;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: transform 0.2s;
    }
    .file-list li:hover {
      transform: translateX(5px);
      background: #edf2f7;
    }
    .file-list a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      flex: 1;
    }
    .file-list a:hover {
      text-decoration: underline;
    }
    .file-size {
      color: #718096;
      font-size: 0.85rem;
      margin-left: 10px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #718096;
      font-style: italic;
    }
    
    .section-icon {
      display: inline-block;
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎭 Playwright Test Results</h1>
    
    <div class="meta">
      <p><strong>Run ID:</strong> ${runId}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="highlight">
      <p style="margin-bottom: 15px;">📊 Full Interactive Report</p>
      <a href="${htmlReportUrl}" target="_blank">View Detailed Report →</a>
    </div>

    <div class="stats">
      <div class="stat-card">
        <h3>${files.videos.length}</h3>
        <p>Videos</p>
      </div>
      <div class="stat-card">
        <h3>${files.screenshots.length}</h3>
        <p>Screenshots</p>
      </div>
      <div class="stat-card">
        <h3>${files.traces.length}</h3>
        <p>Traces</p>
      </div>
      <div class="stat-card">
        <h3>${files.reports.length}</h3>
        <p>Reports</p>
      </div>
      <div class="stat-card">
        <h3>${formatBytes(Object.values(files).flat().reduce((sum, f) => sum + f.size, 0))}</h3>
        <p>Total Size</p>
      </div>
    </div>

    ${files.videos.length > 0 ? `
    <h2><span class="section-icon">🎥</span>Test Videos</h2>
    <div class="video-gallery">
      ${files.videos.map(video => `
        <div class="video-card">
          <video controls preload="metadata">
            <source src="${video.url}" type="video/webm">
            Your browser does not support the video tag.
          </video>
          <div class="video-info">
            <div class="video-name">${video.name}</div>
            <div class="video-meta">
              <span>📦 ${formatBytes(video.size)}</span>
            </div>
            <a href="${video.url}" download="${video.name}" class="download-btn">⬇ Download</a>
          </div>
        </div>
      `).join('')}
    </div>
    ` : '<div class="empty-state">No videos recorded</div>'}

    ${files.screenshots.length > 0 ? `
    <h2><span class="section-icon">📸</span>Screenshots</h2>
    <div class="screenshot-gallery">
      ${files.screenshots.map(screenshot => `
        <div class="screenshot-card">
          <a href="${screenshot.url}" target="_blank">
            <img src="${screenshot.url}" alt="${screenshot.name}" loading="lazy">
          </a>
          <div class="screenshot-info">
            <div>${screenshot.name}</div>
            <div style="color: #a0aec0; margin-top: 5px;">${formatBytes(screenshot.size)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${files.traces.length > 0 ? `
    <h2><span class="section-icon">🔍</span>Trace Files</h2>
    <ul class="file-list">
      ${files.traces.map(trace => `
        <li>
          <a href="${trace.url}" target="_blank">${trace.name}</a>
          <span class="file-size">${formatBytes(trace.size)}</span>
        </li>
      `).join('')}
    </ul>
    ` : ''}

    ${files.others.length > 0 ? `
    <h2><span class="section-icon">📄</span>Other Files</h2>
    <ul class="file-list">
      ${files.others.map(file => `
        <li>
          <a href="${file.url}" target="_blank">${file.name}</a>
          <span class="file-size">${formatBytes(file.size)}</span>
        </li>
      `).join('')}
    </ul>
    ` : ''}

    <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #718096;">
      <p>Generated by Playwright MCP Cloud Testing Pipeline</p>
      <p style="margin-top: 5px; font-size: 0.9rem;">All artifacts stored in AWS S3</p>
    </div>
  </div>

  <script>
    // Add click to fullscreen for screenshots
    document.querySelectorAll('.screenshot-card img').forEach(img => {
      img.addEventListener('click', () => {
        if (img.requestFullscreen) {
          img.requestFullscreen();
        }
      });
    });
  </script>
</body>
</html>
  `;
}

// Run the upload
uploadTestArtifacts().catch(console.error);