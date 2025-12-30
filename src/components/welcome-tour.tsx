"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileStack,
  Calculator,
  BarChart3,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";

const tourSteps = [
  {
    title: "Welcome to ROIC Modeler",
    description: "Your initiative modeling workspace for estimating NOPAT, TUFI, and ROIC. Let's take a quick tour!",
    icon: Sparkles,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>This tool helps you build financial models for business initiatives with guided inputs and automatic calculations.</p>
        <p className="font-medium text-foreground">Key concepts:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>NOPAT</strong> - Net Operating Profit After Tax</li>
          <li><strong>TUFI</strong> - Total Upfront Investment</li>
          <li><strong>ROIC</strong> - Return on Invested Capital</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Create Initiatives",
    description: "Start by creating an initiative from a template.",
    icon: FileStack,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Choose from 5 pre-built templates:</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Freight Optimization
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Price/Mix Improvement
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Working Capital Improvement
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Headcount Productivity
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Vendor Consolidation
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Paint by Numbers",
    description: "Fill in guided inputs with validation and tooltips.",
    icon: Calculator,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Each template has pre-configured drivers that guide you through the inputs:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Revenue impact assumptions</li>
          <li>Cost reduction estimates</li>
          <li>Investment requirements</li>
          <li>Risk adjustments</li>
          <li>Implementation timeline</li>
        </ul>
        <p>Helpful tooltips explain what each field means and how to estimate it.</p>
      </div>
    ),
  },
  {
    title: "View Results",
    description: "See calculated ROIC, NPV, payback period, and IRR instantly.",
    icon: BarChart3,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The calculation engine automatically computes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Annual NOPAT over the modeling period</li>
          <li>Total Upfront Investment (TUFI)</li>
          <li>ROIC percentage</li>
          <li>NPV at your organization's discount rate</li>
          <li>Payback period in years</li>
          <li>Internal Rate of Return (IRR)</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Driver Library",
    description: "Explore all available drivers and their definitions.",
    icon: BookOpen,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The Driver Library contains 39 standardized inputs across categories:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Revenue drivers</li>
          <li>Cost drivers</li>
          <li>Working capital impacts</li>
          <li>Capital expenditure</li>
          <li>Tax & depreciation</li>
          <li>Risk factors</li>
        </ul>
        <p>Check the sidebar to explore the full library.</p>
      </div>
    ),
  },
];

export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("roic-tour-completed");
    if (!hasSeenTour) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("roic-tour-completed", "true");
    setOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem("roic-tour-completed", "true");
    setOpen(false);
  };

  const currentStep = tourSteps[step];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>{currentStep.title}</DialogTitle>
              <DialogDescription>{currentStep.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {currentStep.content}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-2">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip tour
          </Button>
          <Button onClick={handleNext}>
            {step < tourSteps.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              "Get started"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
