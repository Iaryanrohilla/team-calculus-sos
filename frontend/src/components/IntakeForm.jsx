import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Camera, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    contact: '',
    lastSeenLocation: '',
    clothingColor: '',
    height: '',
    idNo: '',
  });
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [watermarkedUrl, setWatermarkedUrl] = useState('');
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // Immediately process the document
    const uploadData = new FormData();
    uploadData.append('document', selectedFile);

    setIsProcessingDocument(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/process-document`, uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { watermarkedUrl, extractedData } = response.data;
      setWatermarkedUrl(watermarkedUrl);
      
      // Auto-fill fields if OCR found something
      if (extractedData) {
        setFormData(prev => ({
          ...prev,
          fullName: extractedData.name || prev.fullName,
          idNo: extractedData.idNo || prev.idNo,
        }));
      }
    } catch (error) {
      console.error('Document processing failed', error);
      alert('Document processing failed. Please fill details manually.');
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post(`${BACKEND_URL}/api/submit-emergency`, {
        profileData: formData,
        watermarkedUrl: watermarkedUrl || preview, // Fallback to raw if processing failed
        timestamp: new Date().toISOString()
      });
      setSubmitSuccess(true);
      // Reset after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setFormData({
          fullName: '', age: '', gender: '', contact: '',
          lastSeenLocation: '', clothingColor: '', height: '', idNo: ''
        });
        setFile(null);
        setPreview(null);
        setWatermarkedUrl('');
      }, 3000);
    } catch (error) {
      console.error('Submission failed', error);
      alert('Failed to submit emergency report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Document Upload Section */}
      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          Identification Document
        </h3>
        
        {!preview ? (
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="bg-white p-3 rounded-full shadow-sm mb-3">
              <Upload className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Click to upload Aadhaar or Passport</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*" 
              className="hidden" 
              capture="environment"
            />
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black">
            <img 
              src={watermarkedUrl || preview} 
              alt="Document preview" 
              className={`w-full max-h-[300px] object-contain transition-opacity ${isProcessingDocument ? 'opacity-50 blur-sm' : 'opacity-100'}`}
            />
            {isProcessingDocument && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm font-medium">Extracting data via OCR...</span>
              </div>
            )}
            {!isProcessingDocument && watermarkedUrl && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold flex items-center gap-1 shadow-sm">
                <CheckCircle className="w-3 h-3" />
                Processed & Watermarked
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFile(null);
                setWatermarkedUrl('');
              }}
              className="absolute top-2 left-2 bg-white/90 text-slate-800 text-xs px-2 py-1 rounded font-semibold shadow-sm hover:bg-white"
            >
              Replace
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 uppercase">Full Name</label>
          <input 
            type="text" 
            name="fullName" 
            value={formData.fullName} 
            onChange={handleInputChange} 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            placeholder="Jane Doe"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 uppercase">ID Number (Extracted)</label>
          <input 
            type="text" 
            name="idNo" 
            value={formData.idNo} 
            onChange={handleInputChange} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-slate-50"
            placeholder="Auto-filled from ID"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Age</label>
            <input 
              type="number" 
              name="age" 
              value={formData.age} 
              onChange={handleInputChange} 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g. 24"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Gender</label>
            <select 
              name="gender" 
              value={formData.gender} 
              onChange={handleInputChange} 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 uppercase">Contact / Email</label>
          <input 
            type="text" 
            name="contact" 
            value={formData.contact} 
            onChange={handleInputChange} 
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Phone number or email"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600 uppercase">Last Seen Location</label>
        <input 
          type="text" 
          name="lastSeenLocation" 
          value={formData.lastSeenLocation} 
          onChange={handleInputChange} 
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Detailed description of the last known location"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 uppercase">Clothing Description</label>
          <input 
            type="text" 
            name="clothingColor" 
            value={formData.clothingColor} 
            onChange={handleInputChange} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="e.g. Red jacket, blue jeans"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 uppercase">Height (Approx)</label>
          <input 
            type="text" 
            name="height" 
            value={formData.height} 
            onChange={handleInputChange} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="e.g. 5'8&quot;"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <button 
          type="submit" 
          disabled={isSubmitting || isProcessingDocument}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-red-600/20"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : submitSuccess ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {isSubmitting ? 'TRANSMITTING...' : submitSuccess ? 'EMERGENCY BROADCASTED' : 'SUBMIT EMERGENCY REPORT'}
        </button>
        <p className="text-center text-xs text-slate-500 mt-3 font-medium">
          Warning: Submitting false reports is a punishable offense.
        </p>
      </div>

    </form>
  );
}
