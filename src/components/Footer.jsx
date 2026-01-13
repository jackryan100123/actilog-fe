import React from 'react';
import { Divider } from 'primereact/divider';
import '../styles/footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <Divider className="footer-divider" />
        
        <div className="footer-bottom">
          <div className="footer-left">
            <span className="footer-copy">
              © {currentYear} <span className="text-teal font-bold">ActiLog</span>. All rights reserved.
            </span>
          </div>

          <div className="footer-links">
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
            <a href="#support" className="footer-link">Support</a>
          </div>

          <div className="footer-social">
            <i className="pi pi-github footer-icon"></i>
            <i className="pi pi-shield footer-icon"></i>
            <i className="pi pi-envelope footer-icon"></i>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;