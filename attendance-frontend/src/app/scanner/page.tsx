/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { Html5Qrcode } from "html5-qrcode";
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  QrCode
} from "lucide-react";

function ScannerContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") as "start" | "end" | "trainer" | "student" | "student_end" | null;

  // Determine authorized role based on query parameter action
  const requiredRole = action === "trainer" ? "trainer" : (action === "start" || action === "end" ? "clerk" : "student");
  
  const { user, loading: authLoading } = useRequireAuth([requiredRole, "admin"]);

  const [scanResult, setScanResult] = useState<"idle" | "scanning" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "reader";
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user) return;

    if (scanResult === "idle" && !qrScannerRef.current) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [user, action, scanResult]);

  const startScanner = async () => {
    try {
      isProcessingRef.current = false;
      setErrorMessage("");
      setSuccessMessage("");
      setScanResult("scanning");

      const html5Qrcode = new Html5Qrcode(scannerContainerId);
      qrScannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          await handleQrCodeScanned(decodedText);
        },
        () => {
          // quiet scan errors
        }
      );
      setCameraPermission("granted");
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraPermission("denied");
      setScanResult("idle");
      setErrorMessage(
        "Camera access denied or device has no camera. Please grant camera permissions in your browser settings."
      );
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.warn("Failed to stop scanner:", err);
      }
      qrScannerRef.current = null;
    }
  };

  const handleQrCodeScanned = async (qrDataString: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    await stopScanner();
    setScanResult("submitting");

    try {
      let payload;
      try {
        payload = JSON.parse(qrDataString);
      } catch {
        throw new Error("Invalid QR Code: format is not a valid JSON structure.");
      }

      if (!payload.sessionId || !payload.batchId || !payload.sessionDate || !payload.token) {
        throw new Error("Invalid QR Code payload structure. Missing required parameters.");
      }

      if (action === "student" && payload.isCheckout) {
        throw new Error("Invalid QR: This is a Check-Out QR code. Please scan the Check-In QR code.");
      }
      if (action === "student_end" && !payload.isCheckout) {
        throw new Error("Invalid QR: This is a Check-In QR code. Please scan the Check-Out QR code.");
      }

      let endpoint = "";
      if (action === "start") endpoint = "/api/scan/start";
      else if (action === "end") endpoint = "/api/scan/end";
      else if (action === "trainer") endpoint = "/api/scan/trainer";
      else if (action === "student") endpoint = "/api/scan/student";
      else if (action === "student_end") endpoint = "/api/scan/student/end";
      else {
        throw new Error("Invalid scan action parameter context.");
      }

      const response = await api.post(endpoint, payload);
      setSuccessMessage(response.data.message || "Attendance check-in processed successfully!");
      setScanResult("success");
    } catch (err: any) {
      console.warn("Scan submit error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to process scan check-in. Please try again.";
      setErrorMessage(msg);
      setScanResult("error");
      // Allow retry if there is an error
      isProcessingRef.current = false;
    }
  };

  const handleRetry = () => {
    isProcessingRef.current = false;
    setScanResult("idle");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const backLink = action === "trainer" ? "/trainer" : (action === "start" || action === "end" ? "/clerk" : "/student");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-6 relative">
      
      {/* Top Navbar */}
      <div className="flex items-center justify-between w-full max-w-md mx-auto z-10">
        <Link
          href={backLink}
          className="p-2.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors flex items-center gap-2 text-xs font-bold shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="text-right">
          <h2 className="text-sm font-bold text-slate-900 capitalize">{action} QR Scan</h2>
          <p className="text-[10px] text-sky-600 font-bold">Mobile Reader</p>
        </div>
      </div>

      {/* Main Scan Window Area */}
      <div className="flex-grow flex items-center justify-center py-8 z-10">
        <div className="w-full max-w-sm aspect-square bg-white border border-slate-200/80 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center shadow-xl shadow-slate-100">
          
          {/* Laser Scanning line animation */}
          {scanResult === "scanning" && (
            <div className="absolute left-0 right-0 h-1 bg-sky-600/80 blur-xs shadow-xs shadow-sky-600/20 top-4 animate-scanner-laser rounded-full z-10" />
          )}

          {/* 1. Camera View Finder container */}
          <div 
            id={scannerContainerId} 
            className={`w-full h-full overflow-hidden rounded-3xl ${
              scanResult === "scanning" ? "block" : "hidden"
            }`}
          />

          {/* 2. Submitting / Processing state */}
          {scanResult === "submitting" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="font-bold text-slate-900 text-sm">Processing Scan...</h3>
              <p className="text-xs text-slate-500 font-medium">Validating token signature and session status.</p>
            </div>
          )}

          {/* 3. Success state */}
          {scanResult === "success" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 animate-scale-up">
                <CheckCircle className="w-14 h-14" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-2">Scan Successful!</h3>
              <p className="text-xs text-slate-500 max-w-xs">{successMessage}</p>
              <Link
                href={backLink}
                className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          )}

          {/* 4. Error state */}
          {scanResult === "error" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="p-4 bg-red-50 border border-red-200 rounded-full text-red-600 animate-scale-up">
                <XCircle className="w-14 h-14" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-2">Scan Failed</h3>
              <p className="text-xs text-red-600/85 max-w-xs">{errorMessage}</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Scanner
              </button>
            </div>
          )}

          {/* 5. Permission / Loading state prior to camera launch */}
          {scanResult === "idle" && cameraPermission === "pending" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="p-4 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl">
                <Camera className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Launching Camera...</h3>
              <p className="text-[10px] text-slate-500 font-medium">Allow camera permission if requested by your browser.</p>
            </div>
          )}

          {/* 6. Permission Denied state */}
          {cameraPermission === "denied" && scanResult === "idle" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Camera Offline</h3>
              <p className="text-xs text-slate-500 max-w-xs">{errorMessage}</p>
              <button
                onClick={startScanner}
                className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-500 transition-colors"
              >
                Retry Camera Access
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Bottom instructions */}
      <div className="w-full max-w-md mx-auto text-center z-10 pb-4">
        <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-sky-600" />
          Point your camera at the session QR code.
        </p>
      </div>

    </div>
  );
}

export default function QRScanner() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ScannerContent />
    </Suspense>
  );
}
