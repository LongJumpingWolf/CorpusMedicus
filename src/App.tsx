import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Plus, Trash2, Layout, Smartphone, Share2, Download, Clipboard, Palette, Check, X, Type, ChevronLeft, Search, Heart, MessageCircle, Send, MoreHorizontal, Bold, Italic, Underline } from 'lucide-react';
import { toPng } from 'html-to-image';
import Cropper from 'react-easy-crop';
import { MCQData, ColorPreset } from './types';

const STORAGE_KEY = 'mcq_designer_pro_v1';

const DEFAULT_DATA: MCQData = {
  title: 'MCQ #01',
  question: 'Calculate the total surface area of a cylinder with radius 7cm and height 10cm.\n\nTake π = 22/7',
  options: {
    A: '748 cm²',
    B: '616 cm²',
    C: '440 cm²',
    D: '880 cm²'
  },
  imageUrl: null,
  imageSettings: {
    height: 220,
    width: 100,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedArea: { x: 0, y: 0, width: 100, height: 100 }
  },
  fontSettings: {
    family: 'Inter',
    questionSize: '18',
    optionSize: '16',
    optionPadding: 12,
    optionGap: 14,
    questionLineHeight: 1.5,
    questionFormatting: {
      bold: [],
      italic: [],
      underline: []
    }
  },
  watermark: {
    text: 'EDUCATION SERIES',
    presets: ['ACADEMIC CONTENT', 'PRACTICE SET', 'EXAM PREP', 'QUIZ MODE'],
    opacity: 0.08
  },
  showGuides: true,
  guideColor: 'white',
  backgroundColor: '#feda59',
  presets: [
    { id: '1', name: 'Classic Yellow', color: '#feda59' },
    { id: '2', name: 'Education Blue', color: '#3b82f6' },
    { id: '3', name: 'Mint Study', color: '#10b981' },
    { id: '4', name: 'Soft Purple', color: '#a855f7' }
  ]
};

export default function App() {
  const [data, setData] = useState<MCQData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge logic for nested objects like watermark
        return {
          ...DEFAULT_DATA,
          ...parsed,
          watermark: {
            ...DEFAULT_DATA.watermark,
            ...(parsed.watermark || {})
          },
          imageSettings: {
            ...DEFAULT_DATA.imageSettings,
            ...(parsed.imageSettings || {})
          },
          fontSettings: {
            ...DEFAULT_DATA.fontSettings,
            ...(parsed.fontSettings || {})
          },
          options: {
            ...DEFAULT_DATA.options,
            ...(parsed.options || {})
          },
          showGuides: parsed.showGuides ?? DEFAULT_DATA.showGuides,
          guideColor: parsed.guideColor ?? DEFAULT_DATA.guideColor
        };
      }
    } catch (err) {
      console.error('Failed to load memory', err);
    }
    return DEFAULT_DATA;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      // Local storage might be full if image is very large
      console.warn('Memory full, could not save state', err);
    }
  }, [data]);

  const [isExporting, setIsExporting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const fontOptions = [
    { name: 'Modern Sans', value: 'Inter' },
    { name: 'Clean Mulish', value: 'Mulish' },
    { name: 'Tech Grotesk', value: 'Space Grotesk' },
    { name: 'Elegant Serif', value: 'Playfair Display' },
    { name: 'Code Mono', value: 'JetBrains Mono' },
    { name: 'Soft Outfit', value: 'Outfit' }
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropChange = (crop: { x: number; y: number }) => {
    setData(prev => ({
      ...prev,
      imageSettings: { ...prev.imageSettings, crop }
    }));
  };

  const onCropComplete = (croppedArea: { x: number; y: number; width: number; height: number }, _croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
    setData(prev => ({
      ...prev,
      imageSettings: { ...prev.imageSettings, croppedArea }
    }));
  };

  const onZoomChange = (zoomLevel: number) => {
    // Convert centered slider value (-2 to 2) to actual zoom multiplier (0.5 to 4)
    // 0 = 1x (100%), negative = zoom out, positive = zoom in
    const zoomMultiplier = Math.pow(2, zoomLevel);
    setData(prev => ({
      ...prev,
      imageSettings: { ...prev.imageSettings, zoom: zoomMultiplier }
    }));
  };

  const removeImage = () => {
    setData(prev => ({ ...prev, imageUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCropping(false);
  };

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (captureRef.current === null) return;
    setIsExporting(true);
    try {
      const options = { 
        cacheBust: true, 
        pixelRatio: 2,
        backgroundColor: data.backgroundColor, // Ensure background is captured even if transparent in DOM
      };
      
      const dataUrl = await toPng(captureRef.current, options);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err: any) {
      console.error('Copy failed', err);
      // Fallback for non-secure contexts or failures
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        alert('Clipboard access denied. Please download the image instead.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPng = async () => {
    if (captureRef.current === null) return;
    setIsExporting(true);
    try {
      const options = { 
        cacheBust: true, 
        pixelRatio: 3,
        backgroundColor: data.backgroundColor,
      };
      const dataUrl = await toPng(captureRef.current, options);
      const link = document.createElement('a');
      link.download = `${data.title || 'mcq'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as any).clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
          setIsCropping(true);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: ColorPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      color: data.backgroundColor
    };
    setData(prev => ({
      ...prev,
      presets: [...prev.presets, newPreset]
    }));
    setNewPresetName('');
  };

  const deletePreset = (id: string) => {
    setData(prev => ({
      ...prev,
      presets: prev.presets.filter(p => p.id !== id)
    }));
  };

  const handleNewMCQ = () => {
    setData(prev => ({
      ...prev,
      title: DEFAULT_DATA.title,
      question: DEFAULT_DATA.question,
      options: { ...DEFAULT_DATA.options },
      backgroundColor: DEFAULT_DATA.backgroundColor,
      imageUrl: null
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10 sm:pb-20 overflow-x-hidden w-full">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <div className="bg-blue-600 p-1 rounded-lg shrink-0 sm:p-1.5">
              <Layout className="text-white w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-xs sm:text-lg font-bold tracking-tight text-slate-800 truncate">MCQ Designer</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button 
              onClick={handleNewMCQ}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              title="New MCQ"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">New</span>
            </button>
            <button 
              disabled={isExporting || isCopied}
              className="flex items-center gap-1.5 bg-slate-800 text-white px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 min-w-0 sm:min-w-[120px] justify-center"
              onClick={copyToClipboard}
            >
              {isCopied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Clipboard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy Preview'}</span>
              <span className="inline sm:hidden">{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
            <button 
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 scale-100 active:scale-95 disabled:opacity-50"
              onClick={exportAsPng}
            >
              {isExporting ? <Plus className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              <span className="hidden xs:inline">PNG</span>
              <span className="hidden sm:inline text-white/90"> Download</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          
          {/* Left Column: Editor */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Layout className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Content & Style</h2>
              </div>

              <div className="space-y-4">
                
                {/* 1. Color Palette (NEW TOP POSITION) */}
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">1. Background Color</span>
                    <Palette className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  <div className="flex gap-3 items-center">
                    <div 
                      className="w-12 h-12 rounded-full border-2 border-slate-200 shadow-sm relative overflow-hidden shrink-0 group hover:border-blue-500 hover:scale-105 transition-all cursor-pointer"
                      style={{ backgroundColor: data.backgroundColor }}
                    >
                      <input 
                        type="color" 
                        value={data.backgroundColor}
                        onChange={(e) => setData({ ...data, backgroundColor: e.target.value })}
                        className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer opacity-0"
                      />
                    </div>
                    <div className="flex-1 flex gap-1.5">
                      <input 
                        type="text" 
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                        placeholder="Save as Preset..."
                      />
                      <button 
                        onClick={savePreset}
                        className="bg-slate-900 text-white p-1.5 rounded-lg hover:bg-slate-800"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {data.presets.map(p => (
                      <div 
                        key={p.id}
                        className="group flex items-center gap-1.5 bg-white pl-1.5 pr-2 py-1 rounded-full border border-slate-200 shadow-sm hover:border-blue-400 transition-colors"
                      >
                        <button 
                          onClick={() => setData({ ...data, backgroundColor: p.color })}
                          className="w-4 h-4 rounded-full border border-slate-200"
                          style={{ backgroundColor: p.color }}
                        />
                        <span 
                          className="text-[10px] font-bold text-slate-600 truncate max-w-[60px] cursor-pointer"
                          onClick={() => setData({ ...data, backgroundColor: p.color })}
                        >
                          {p.name}
                        </span>
                        <button onClick={() => deletePreset(p.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Header Title */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 tracking-wider font-mono">2. Header Title</label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-sm"
                    placeholder="MCQ Title..."
                  />
                </div>

                {/* 3. Image Section */}
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">3. Image Material</label>
                  {!data.imageUrl ? (
                    <div 
                      className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all bg-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                      <p className="text-xs font-bold text-slate-500">Upload or Paste</p>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Height</label>
                            <input 
                              type="range" min="80" max="400"
                              value={data.imageSettings.height}
                              onChange={(e) => setData({ ...data, imageSettings: { ...data.imageSettings, height: parseInt(e.target.value) }})}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Width %</label>
                            <input 
                              type="range" min="40" max="100"
                              value={data.imageSettings.width}
                              onChange={(e) => setData({ ...data, imageSettings: { ...data.imageSettings, width: parseInt(e.target.value) }})}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                         </div>
                      </div>
                      <div className="relative group rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white p-2">
                        <img src={data.imageUrl} className="w-full h-32 object-cover opacity-60 rounded-xl" alt="Source" />
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <button onClick={() => setIsCropping(true)} className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xl transition-transform hover:scale-105">
                            <Layout className="w-3.5 h-3.5" /> Adjust Crop
                          </button>
                          <button onClick={removeImage} className="bg-red-500 text-white p-1.5 rounded-lg shadow-xl hover:bg-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Question Text */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 tracking-wider font-mono">4. Question Text</label>
                  
                  {/* Formatting Toolbar */}
                  <div className="flex gap-1.5 mb-2">
                    <button
                      onClick={() => {
                        if (!questionTextareaRef.current) return;
                        const start = questionTextareaRef.current.selectionStart;
                        const end = questionTextareaRef.current.selectionEnd;
                        if (start === end) return; // No selection
                        
                        setData(prev => ({
                          ...prev,
                          fontSettings: { 
                            ...prev.fontSettings, 
                            questionFormatting: { 
                              ...prev.fontSettings.questionFormatting, 
                              bold: [...prev.fontSettings.questionFormatting.bold, { start, end }]
                            } 
                          }
                        }));
                      }}
                      className="p-1.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 transition-all"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!questionTextareaRef.current) return;
                        const start = questionTextareaRef.current.selectionStart;
                        const end = questionTextareaRef.current.selectionEnd;
                        if (start === end) return; // No selection
                        
                        setData(prev => ({
                          ...prev,
                          fontSettings: { 
                            ...prev.fontSettings, 
                            questionFormatting: { 
                              ...prev.fontSettings.questionFormatting, 
                              italic: [...prev.fontSettings.questionFormatting.italic, { start, end }]
                            } 
                          }
                        }));
                      }}
                      className="p-1.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 transition-all"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!questionTextareaRef.current) return;
                        const start = questionTextareaRef.current.selectionStart;
                        const end = questionTextareaRef.current.selectionEnd;
                        if (start === end) return; // No selection
                        
                        setData(prev => ({
                          ...prev,
                          fontSettings: { 
                            ...prev.fontSettings, 
                            questionFormatting: { 
                              ...prev.fontSettings.questionFormatting, 
                              underline: [...prev.fontSettings.questionFormatting.underline, { start, end }]
                            } 
                          }
                        }));
                      }}
                      className="p-1.5 rounded-lg border bg-white border-slate-200 hover:border-slate-300 transition-all"
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Line Spacing Control */}
                  <div className="mb-2 flex items-center gap-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Line Spacing</label>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.1"
                      value={data.fontSettings.questionLineHeight}
                      onChange={(e) => setData({
                        ...data,
                        fontSettings: { ...data.fontSettings, questionLineHeight: parseFloat(e.target.value) }
                      })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs font-bold text-blue-600 min-w-[35px]">{data.fontSettings.questionLineHeight.toFixed(1)}</span>
                  </div>

                  <textarea
                    ref={questionTextareaRef}
                    value={data.question}
                    onChange={(e) => setData({ ...data, question: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 min-h-[100px] font-medium text-sm resize-none"
                    placeholder="Enter question details..."
                  />
                </div>

                {/* 5. Answer Options */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">5. Answer Options</label>
                  <div className="space-y-2">
                    {Object.entries(data.options).map(([key, value]) => (
                      <div key={key} className="flex gap-3 items-center group">
                        <div className="bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                          {key}
                        </div>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setData({ ...data, options: { ...data.options, [key]: e.target.value }})}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-medium transition-all group-hover:border-slate-300 placeholder:text-slate-300"
                          placeholder="Option text..."
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography & Layout Settings */}
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">Styling & Watermark</span>
                    <Type className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  <div className="space-y-3">
                    {/* Font Family */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Font Family</label>
                      <select 
                        value={data.fontSettings.family}
                        onChange={(e) => setData({ ...data, fontSettings: { ...data.fontSettings, family: e.target.value }})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-sm"
                      >
                        {fontOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Q Size */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qn Size</label>
                        <input
                          type="number"
                          value={data.fontSettings.questionSize}
                          onChange={(e) => setData({ ...data, fontSettings: { ...data.fontSettings, questionSize: e.target.value }})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
                        />
                      </div>
                      {/* Opt Size */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Opt Size</label>
                        <input
                          type="number"
                          value={data.fontSettings.optionSize}
                          onChange={(e) => setData({ ...data, fontSettings: { ...data.fontSettings, optionSize: e.target.value }})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
                        />
                      </div>
                    </div>

                    {/* Option Padding */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <span>Box Padding</span>
                          <span>{data.fontSettings.optionPadding}px</span>
                        </label>
                        <input 
                          type="range" min="4" max="24"
                          value={data.fontSettings.optionPadding}
                          onChange={(e) => setData({ ...data, fontSettings: { ...data.fontSettings, optionPadding: parseInt(e.target.value) }})}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div>
                        <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <span>Option Spacing</span>
                          <span>{data.fontSettings.optionGap}px</span>
                        </label>
                        <input 
                          type="range" min="0" max="40"
                          value={data.fontSettings.optionGap}
                          onChange={(e) => setData({ ...data, fontSettings: { ...data.fontSettings, optionGap: parseInt(e.target.value) }})}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>

                    {/* Watermark Editor */}
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Watermark Text & Opacity</label>
                        <button 
                          onClick={() => {
                            if (data.watermark.text && !data.watermark.presets.includes(data.watermark.text)) {
                              setData({
                                ...data,
                                watermark: {
                                  ...data.watermark,
                                  presets: [...data.watermark.presets, data.watermark.text]
                                }
                              });
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Save Preset
                        </button>
                      </div>
                      <div className="flex justify-between gap-2">
                        <input 
                          type="text"
                          value={data.watermark.text}
                          onChange={(e) => setData({ ...data, watermark: { ...data.watermark, text: e.target.value.toUpperCase() }})}
                          className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-2 sm:py-2.5 font-bold text-[10px] sm:text-xs tracking-widest"
                        />
                        <div className="w-16 sm:w-20 shrink-0 space-y-1">
                          <div className="flex justify-between text-[7px] sm:text-[8px] font-black text-slate-400">
                             <span>OPACITY</span>
                             <span>{Math.round(data.watermark.opacity * 100)}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="0.5" step="0.01"
                            value={data.watermark.opacity}
                            onChange={(e) => setData({ ...data, watermark: { ...data.watermark, opacity: parseFloat(e.target.value) }})}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.watermark.presets.map(p => (
                          <div key={p} className="group relative">
                            <button 
                              onClick={() => setData({ ...data, watermark: { ...data.watermark, text: p }})}
                              className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-bold text-slate-500 hover:border-blue-400 transition-colors"
                            >
                              {p}
                            </button>
                            <button 
                              onClick={() => {
                                setData({
                                  ...data,
                                  watermark: {
                                    ...data.watermark,
                                    presets: data.watermark.presets.filter(pr => pr !== p)
                                  }
                                });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7 flex flex-col items-center lg:sticky lg:top-20 order-first lg:order-last mb-8 lg:mb-0 w-full overflow-hidden px-2">
            <div className="w-full flex flex-col items-center max-w-[400px]">
              {/* Preview Labels & Action Controls */}
              <div className="w-full flex items-center justify-between px-1 mb-4 gap-2">
                <div className="flex items-center gap-1.5 opacity-40 shrink-0">
                  <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Simulation</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 shrink-0">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[7px] sm:text-[9px] font-bold text-green-600 whitespace-nowrap uppercase">HD Export Ready</span>
                </div>
              </div>

              {/* Responsive Simulation Wrapper */}
              <div className="relative w-full flex flex-col items-center group px-1 sm:px-0 bg-transparent">
                {/* View Settings Floating Pane */}
                <div className="mb-4 flex justify-center gap-3 lg:absolute lg:-left-16 lg:right-auto lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:w-auto z-[60] lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                   <div className="bg-white/90 backdrop-blur-md p-1.5 lg:p-2 rounded-2xl shadow-xl border border-slate-200/50 flex flex-row lg:flex-col gap-2 lg:gap-3 w-fit">
                      <button 
                        onClick={() => setData(prev => ({ ...prev, showGuides: !prev.showGuides }))}
                        title="Toggle Reels Guides"
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${data.showGuides ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                      >
                        <Layout className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => setData(prev => ({ ...prev, guideColor: data.guideColor === 'white' ? 'black' : 'white' }))}
                        title="Switch Guide Tone"
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all ${data.guideColor === 'white' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'}`}
                      >
                        <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                   </div>
                </div>

                {/* The Container that hosts BOTH guidelines and capture area */}
                <div className="relative w-full max-w-full flex justify-center overflow-visible">
                  {/* Outer scaling wrapper that handles layout space */}
                  <div 
                    className="w-[400px] h-[711px] origin-top transition-transform duration-300 pointer-events-auto shrink-0"
                    style={{ 
                      transform: `scale(var(--preview-scale, 1))`
                    }}
                    ref={(el) => {
                      if (!el) return;
                      const parent = el.parentElement;
                      if (!parent) return;

                      const updateScale = () => {
                        // More aggressive padding for mobile margins
                        const padding = window.innerWidth < 640 ? 32 : 16;
                        const scale = Math.min(1, (parent.clientWidth - padding) / 400);
                        el.style.setProperty('--preview-scale', scale.toString());
                        parent.style.height = `${711 * scale}px`;
                      };
                      
                      updateScale();
                      const observer = new ResizeObserver(updateScale);
                      observer.observe(parent);
                      window.addEventListener('resize', updateScale);
                    }}
                  >
                     {/* Reels Guidelines Overlay */}
                     {data.showGuides && (
                       <div 
                          className={`absolute inset-0 pointer-events-none z-50 transition-colors duration-300 ${data.guideColor === 'white' ? 'text-white' : 'text-black'} overflow-hidden select-none`}
                          style={{ fontSize: '14px' }}
                       >
                         {/* Status Bar */}
                         <div className="absolute top-[1.5%] left-[8%] right-[8%] flex justify-between items-center opacity-40 font-black tracking-widest" style={{ fontSize: '0.8em' }}>
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                            <div className="flex gap-1.5 items-center">
                               <span className="scale-75">5G</span>
                               <div className="w-[1.2em] h-[0.6em] border border-current rounded-[1px] relative">
                                  <div className="absolute inset-[1px] bg-current w-[70%]" />
                               </div>
                            </div>
                         </div>
  
                         {/* Top Nav */}
                         <div className="absolute top-[5%] left-[5%] opacity-80">
                           <ChevronLeft className="w-[2em] h-[2em] stroke-[3]" />
                         </div>
                         <div className="absolute top-[5%] right-[5%] opacity-80">
                           <Search className="w-[1.8em] h-[1.8em] stroke-[3]" />
                         </div>
  
                         {/* Right Side Buttons */}
                         <div className="absolute right-[2.5%] bottom-[22%] flex flex-col items-center gap-[1.5em] opacity-90">
                           <div className="flex flex-col items-center">
                             <Heart className="w-[2.2em] h-[2.2em] fill-current" />
                             <span className="font-black mt-1" style={{ fontSize: '0.8em' }}>207</span>
                           </div>
                           <div className="flex flex-col items-center">
                             <MessageCircle className="w-[2.2em] h-[2.2em]" />
                             <span className="font-black mt-1" style={{ fontSize: '0.8em' }}>7</span>
                           </div>
                           <div className="flex flex-col items-center">
                             <Send className="w-[2em] h-[2em]" />
                             <span className="font-black mt-1" style={{ fontSize: '0.8em' }}>36</span>
                           </div>
                           <div className="flex flex-col items-center">
                             <MoreHorizontal className="w-[2em] h-[2em]" />
                           </div>
                         </div>
  
                         {/* Bottom Info Section */}
                         <div className="absolute left-[5%] bottom-[6%] right-[20%] opacity-90">
                           <div className="flex items-center gap-2 mb-2">
                             <div className="w-[2.5em] h-[2.5em] rounded-full border border-current flex-shrink-0" />
                             <span className="font-black truncate max-w-[45%]" style={{ fontSize: '1.1em' }}>portrait_vission</span>
                             <div className="border border-current px-[0.6em] py-[0.1em] rounded-[0.3em] font-black uppercase whitespace-nowrap" style={{ fontSize: '0.65em' }}>Follow</div>
                           </div>
                           <div className="font-bold leading-snug line-clamp-2 pr-4" style={{ fontSize: '0.9em' }}>
                              Design within safe-zones to prevent element overlap. Simulation v1.4 #study #mcq #design #pro
                           </div>
                         </div>
                       </div>
                     )}
  
                     {/* The SHARP EXPORT-READY Area (Captured) */}
                     <div 
                       ref={captureRef}
                       className="absolute inset-0 overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.35)] bg-white"
                       style={{ backgroundColor: data.backgroundColor }}
                     >
                      <div 
                        className="w-full h-full p-8 flex flex-col pt-10"
                        style={{ fontFamily: data.fontSettings.family }}
                      >
                        {/* Title Area */}
                        <h3 className="text-center text-4xl font-black text-black leading-tight mb-4 tracking-tight uppercase">
                          {data.title}
                        </h3>
        
                        {/* Image Display */}
                        <AnimatePresence mode="popLayout">
                          {data.imageUrl && data.imageSettings.croppedArea && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              className="relative rounded-2xl mb-5 shadow-2xl overflow-hidden shrink-0 mx-auto"
                              style={{ 
                                height: `${data.imageSettings.height}px`,
                                width: `${data.imageSettings.width}%`
                              }}
                            >
                               <img 
                                  src={data.imageUrl} 
                                  className="absolute max-w-none max-h-none transition-none select-none pointer-events-none"
                                  style={{
                                    width: `${10000 / (data.imageSettings.croppedArea?.width || 100)}%`,
                                    height: `${10000 / (data.imageSettings.croppedArea?.height || 100)}%`,
                                    left: `${-(data.imageSettings.croppedArea?.x || 0) * (100 / (data.imageSettings.croppedArea?.width || 100))}%`,
                                    top: `${-(data.imageSettings.croppedArea?.y || 0) * (100 / (data.imageSettings.croppedArea?.height || 100))}%`,
                                  }}
                                  alt="Cropped"
                                />
                            </motion.div>
                          )}
                        </AnimatePresence>
        
                        {/* Content & Options */}
                        <div className="flex-1 min-h-0 flex pt-1 relative">
                          {/* Vertical Watermark */}
                          <div className="absolute left-[-26px] bottom-0 top-0 w-4 flex flex-col justify-center pointer-events-none overflow-visible">
                            <div className="rotate-180 whitespace-nowrap origin-center" style={{ writingMode: 'vertical-rl', opacity: data.watermark.opacity }}>
                               <span className="font-black text-[7px] md:text-[8px] tracking-[0.5em] text-black">
                                  {data.watermark.text}
                                </span>
                            </div>
                          </div>
      
                          <div className="flex-1 flex flex-col">
                            <p 
                              className="font-bold text-black mb-6 whitespace-pre-wrap flex-none"
                              style={{ 
                                fontSize: `${data.fontSettings.questionSize}px`,
                                lineHeight: data.fontSettings.questionLineHeight
                              }}
                            >
                              {(() => {
                                const text = data.question;
                                if (text.length === 0) return text;
                                
                                // Build array of formatting for each character
                                const charFormats = Array(text.length).fill(null).map((_, i) => ({
                                  bold: data.fontSettings.questionFormatting.bold.some(r => i >= r.start && i < r.end),
                                  italic: data.fontSettings.questionFormatting.italic.some(r => i >= r.start && i < r.end),
                                  underline: data.fontSettings.questionFormatting.underline.some(r => i >= r.start && i < r.end)
                                }));
                                
                                // Create segments with same formatting
                                const segments = [];
                                let current = { start: 0, ...charFormats[0] };
                                
                                for (let i = 1; i <= text.length; i++) {
                                  const isSame = i < text.length && 
                                    charFormats[i].bold === current.bold && 
                                    charFormats[i].italic === current.italic && 
                                    charFormats[i].underline === current.underline;
                                  
                                  if (!isSame) {
                                    segments.push({ ...current, end: i });
                                    if (i < text.length) {
                                      current = { start: i, ...charFormats[i] };
                                    }
                                  }
                                }
                                
                                return segments.map((seg, idx) => (
                                  <span 
                                    key={idx}
                                    style={{
                                      fontWeight: seg.bold ? 'bold' : 'normal',
                                      fontStyle: seg.italic ? 'italic' : 'normal',
                                      textDecoration: seg.underline ? 'underline' : 'none',
                                      textDecorationThickness: '2px',
                                      textUnderlineOffset: '4px'
                                    }}
                                  >
                                    {text.slice(seg.start, seg.end)}
                                  </span>
                                ));
                              })()}
                            </p>
          
                            <div 
                              className="flex-1 flex flex-col"
                              style={{ gap: `${data.fontSettings.optionGap}px` }}
                            >
                              {Object.entries(data.options).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="bg-white/95 border-b-4 border-black/10 rounded-xl flex items-start gap-3 shadow-md"
                                  style={{ padding: `${data.fontSettings.optionPadding}px` }}
                                >
                                  <span className="font-black text-black shrink-0 mt-0.5" style={{ fontSize: `${data.fontSettings.optionSize}px` }}>{key}.</span>
                                  <span 
                                    className="font-bold text-slate-900 flex-1 leading-tight"
                                    style={{ 
                                      fontSize: `${data.fontSettings.optionSize}px`,
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      wordBreak: 'break-word',
                                      minWidth: 0
                                    }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
        
                        {/* Social Deco */}
                        <div className="mt-4 pt-4 border-t border-black/5 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Modal Cropper */}
      <AnimatePresence>
        {isCropping && data.imageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
              onClick={() => setIsCropping(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative bg-white w-full max-w-2xl h-full max-h-[85vh] sm:h-[600px] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/20 mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 sm:gap-3">
                   <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl"><ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
                   <h3 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight">Calibration</h3>
                </div>
                <button onClick={() => setIsCropping(false)} className="bg-white border border-slate-200 p-2 sm:p-2.5 rounded-full hover:bg-slate-100 transition-colors shadow-sm">
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                </button>
              </div>

              <div className="relative flex-1 bg-slate-900 overflow-hidden">
                <Cropper
                  image={data.imageUrl}
                  crop={data.imageSettings.crop || { x: 0, y: 0 }}
                  zoom={data.imageSettings.zoom || 1}
                  aspect={(336 * data.imageSettings.width / 100) / data.imageSettings.height}
                  onCropChange={onCropChange}
                  onCropComplete={onCropComplete}
                  onZoomChange={onZoomChange}
                  showGrid={false}
                  objectFit="cover"
                  restrictPosition={false}
                  classes={{
                    containerClassName: "cropper-container"
                  }}
                />
              </div>

              <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Focus Level</span>
                    <span className="text-xs sm:text-base font-black text-blue-600">{Math.round((data.imageSettings.zoom || 1) * 100)}%</span>
                  </div>
                  <input
                    type="range" min="-2" max="2" step={0.01}
                    value={Math.log2(data.imageSettings.zoom || 1)}
                    onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 sm:h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <button 
                  onClick={() => setIsCropping(false)}
                  className="w-full bg-slate-900 text-white py-2 sm:py-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:bg-black transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
