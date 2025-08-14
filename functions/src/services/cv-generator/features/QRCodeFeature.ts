import { ParsedCV } from '../../cvParser';
import { CVFeature } from '../types';

/**
 * QR Code feature generator
 * Creates a QR code linking to the online CV
 */
export class QRCodeFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: { size?: number }): Promise<string> {
    const size = options?.size || 120;
    const cvUrl = `https://getmycv-ai.web.app/cv/${cv.personalInfo.name?.replace(/\s+/g, '-').toLowerCase()}`;
    
    return `
      <div class="qr-code">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(cvUrl)}" 
             alt="QR Code" 
             title="Scan to view online" />
        <p class="qr-caption">Scan to view online</p>
      </div>
    `;
  }

  getStyles(): string {
    return `
      .qr-code {
        position: absolute;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 10;
        text-align: center;
        border: 2px solid #f0f0f0;
      }
      
      .qr-code img {
        display: block;
        width: 120px;
        height: 120px;
        margin: 0 auto 8px;
      }
      
      .qr-caption {
        font-size: 11px;
        color: #666;
        margin: 0;
        font-weight: 500;
      }
      
      @media print, screen {
        .qr-code {
          position: static !important;
          float: right;
          margin: 0 0 20px 20px;
          clear: both;
          background: white !important;
          border: 1px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        
        .header {
          position: relative;
          overflow: visible;
        }
      }
      
      @media (max-width: 768px) {
        .qr-code {
          position: static !important;
          float: none !important;
          margin: 20px auto !important;
          display: block;
        }
      }
    `;
  }

  getScripts(): string {
    return '';
  }
}