import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Crown } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface PDFExportButtonProps {
  content: string;
  title?: string;
}

export const PDFExportButton = ({ content, title = "Programme d'entraînement" }: PDFExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const detectProgramType = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("boxe") || lowerText.includes("boxing")) return "Programme de Boxe";
    if (lowerText.includes("mma") || lowerText.includes("mixed martial")) return "Programme MMA";
    if (lowerText.includes("jiu-jitsu") || lowerText.includes("bjj")) return "Programme Jiu-Jitsu";
    if (lowerText.includes("muay thai") || lowerText.includes("kickboxing")) return "Programme Muay Thai";
    if (lowerText.includes("musculation") || lowerText.includes("strength")) return "Programme Musculation";
    if (lowerText.includes("macro") || lowerText.includes("nutrition") || lowerText.includes("calorie")) return "Plan Nutritionnel";
    if (lowerText.includes("recette") || lowerText.includes("recipe")) return "Recette Protéinée";
    return title;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Premium dark background header
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, pageWidth, 50, "F");

      // Gold accent line
      doc.setFillColor(234, 179, 8);
      doc.rect(0, 50, pageWidth, 3, "F");

      // Logo text - KOREV AI
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("KOREV AI", pageWidth / 2, 25, { align: "center" });

      // Subtitle
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Performance Center • Coach IA", pageWidth / 2, 35, { align: "center" });

      // Program title
      const programTitle = detectProgramType(content);
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(programTitle, pageWidth / 2, 65, { align: "center" });

      // Date
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const currentDate = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      doc.text(`Généré le ${currentDate}`, pageWidth / 2, 73, { align: "center" });

      // Divider line
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.5);
      doc.line(margin, 80, pageWidth - margin, 80);

      // Content
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      // Parse and format content
      const lines = content.split("\n");
      let yPosition = 90;
      const lineHeight = 6;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
          
          // Add header on new pages
          doc.setFillColor(15, 15, 15);
          doc.rect(0, 0, pageWidth, 15, "F");
          doc.setTextColor(234, 179, 8);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("KOREV AI", 15, 10);
          yPosition = 25;
        }

        if (!trimmedLine) {
          yPosition += lineHeight / 2;
          continue;
        }

        // Format headers (lines starting with # or all caps or numbered sections)
        if (trimmedLine.startsWith("##") || trimmedLine.startsWith("**") || /^[0-9]+[.):]\s/.test(trimmedLine)) {
          doc.setFillColor(248, 248, 248);
          doc.roundedRect(margin - 2, yPosition - 4, contentWidth + 4, 8, 1, 1, "F");
          
          doc.setTextColor(234, 179, 8);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const cleanLine = trimmedLine.replace(/^[#*]+\s*/, "").replace(/\*\*/g, "");
          const splitLines = doc.splitTextToSize(cleanLine, contentWidth);
          doc.text(splitLines[0], margin, yPosition);
          yPosition += lineHeight + 2;
          
          // Handle remaining split lines
          for (let i = 1; i < splitLines.length; i++) {
            doc.text(splitLines[i], margin, yPosition);
            yPosition += lineHeight;
          }
        }
        // Format bullet points
        else if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•") || trimmedLine.startsWith("*")) {
          doc.setTextColor(234, 179, 8);
          doc.setFontSize(10);
          doc.text("●", margin, yPosition);
          
          doc.setTextColor(60, 60, 60);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const bulletContent = trimmedLine.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "");
          const splitLines = doc.splitTextToSize(bulletContent, contentWidth - 8);
          
          for (let i = 0; i < splitLines.length; i++) {
            doc.text(splitLines[i], margin + 6, yPosition);
            yPosition += lineHeight;
          }
        }
        // Regular text
        else {
          doc.setTextColor(60, 60, 60);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const cleanLine = trimmedLine.replace(/\*\*/g, "");
          const splitLines = doc.splitTextToSize(cleanLine, contentWidth);
          
          for (const splitLine of splitLines) {
            doc.text(splitLine, margin, yPosition);
            yPosition += lineHeight;
          }
        }
      }

      // Footer on last page
      const lastPageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(15, 15, 15);
      doc.rect(0, lastPageHeight - 20, pageWidth, 20, "F");
      
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Programme généré par KOREV AI • Coach IA Personnel", pageWidth / 2, lastPageHeight - 10, { align: "center" });

      // Premium badge
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(pageWidth - 45, lastPageHeight - 15, 35, 10, 2, 2, "F");
      doc.setTextColor(15, 15, 15);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("PREMIUM", pageWidth - 27.5, lastPageHeight - 9, { align: "center" });

      // Save the PDF
      const fileName = `KOREV_AI_${programTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF exporté avec succès !");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToPDF}
      disabled={isExporting}
      className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
    >
      {isExporting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <FileDown className="h-3 w-3" />
          <Crown className="h-3 w-3 text-primary" />
        </>
      )}
      <span className="text-xs">Export PDF</span>
    </Button>
  );
};
