/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EditorialProvider } from './context/EditorialContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AllWritingsPage } from './pages/AllWritingsPage';
import { ArticlePage } from './pages/ArticlePage';
import { CategoryPage } from './pages/CategoryPage';
import { SearchPage } from './pages/SearchPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { ThoughtsPage } from './pages/ThoughtsPage';
import { AccountPage } from './pages/AccountPage';

export default function App() {
  return (
    <ErrorBoundary>
      <EditorialProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col paper-surface paper-grain text-[#25231F]">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/writings" element={<AllWritingsPage />} />
                <Route path="/writings/:slug" element={<ArticlePage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/thoughts" element={<ThoughtsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </EditorialProvider>
    </ErrorBoundary>
  );
}
