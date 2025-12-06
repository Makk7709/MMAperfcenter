import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface FighterStats {
  punches_thrown: number;
  punches_landed: number;
  kicks_thrown: number;
  kicks_landed: number;
  takedowns_attempted: number;
  takedowns_successful: number;
  submissions_attempted: number;
  clinch_time_percent: number;
  ground_time_percent: number;
  significant_strikes: number;
  head_strikes: number;
  body_strikes: number;
  leg_strikes: number;
  defense_rate: number;
}

interface Fighter {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
}

interface PerformanceScores {
  overall: number;
  striking: number;
  grappling: number;
  defense: number;
  cardio: number;
}

interface SparringAnalysisData {
  summary: string;
  duration_estimate: string;
  fighters: Fighter[];
  statistics: {
    fighter_1: FighterStats;
    fighter_2: FighterStats;
  };
  techniques_observed: {
    technique: string;
    fighter: string;
    execution: string;
    timestamp_approx: string;
  }[];
  recommendations: {
    fighter_1: string[];
    fighter_2: string[];
  };
  overall_analysis: string;
  performance_scores: {
    fighter_1: PerformanceScores;
    fighter_2: PerformanceScores;
  };
}

interface SparringPDFExportProps {
  analysis: SparringAnalysisData;
  videoName: string;
  analysisDate: string;
}

export const SparringPDFExport = ({ analysis, videoName, analysisDate }: SparringPDFExportProps) => {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper functions
      const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; color?: [number, number, number] } = {}) => {
        const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0] } = options;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(...color);
        doc.text(text, x, y);
        return y + fontSize * 0.5;
      };

      const addLine = (y: number, color: [number, number, number] = [212, 175, 55]) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        return y + 5;
      };

      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Colors
      const gold: [number, number, number] = [212, 175, 55];
      const darkGray: [number, number, number] = [50, 50, 50];
      const red: [number, number, number] = [220, 53, 69];
      const blue: [number, number, number] = [13, 110, 253];
      const green: [number, number, number] = [25, 135, 84];

      // Header Background
      doc.setFillColor(20, 20, 25);
      doc.rect(0, 0, pageWidth, 50, 'F');

      // Logo / Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gold);
      doc.text('KOREV AI', margin, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('Rapport d\'Analyse de Sparring', margin, 35);

      // Date
      doc.setFontSize(10);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 70, 35);

      yPosition = 65;

      // Video Info
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, yPosition - 5, pageWidth - 2 * margin, 20, 3, 3, 'F');
      
      addText(`📹 ${videoName}`, margin + 5, yPosition + 5, { fontSize: 11, fontStyle: 'bold', color: darkGray });
      addText(`Durée: ${analysis.duration_estimate} | Date d'analyse: ${new Date(analysisDate).toLocaleDateString('fr-FR')}`, margin + 5, yPosition + 12, { fontSize: 9, color: [100, 100, 100] });
      
      yPosition += 30;

      // Summary Section
      addText('RÉSUMÉ DU COMBAT', margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: gold });
      yPosition += 8;
      yPosition = addLine(yPosition, gold);
      
      const summaryLines = doc.splitTextToSize(analysis.summary, pageWidth - 2 * margin);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 10;

      // Performance Scores
      checkNewPage(80);
      addText('SCORES DE PERFORMANCE', margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: gold });
      yPosition += 8;
      yPosition = addLine(yPosition, gold);

      const fighter1 = analysis.fighters?.[0];
      const fighter2 = analysis.fighters?.[1];
      const scores1 = analysis.performance_scores?.fighter_1;
      const scores2 = analysis.performance_scores?.fighter_2;

      if (scores1 && scores2) {
        // Fighter 1 scores
        const colWidth = (pageWidth - 2 * margin - 20) / 2;
        
        // Fighter 1 Box
        doc.setFillColor(255, 240, 240);
        doc.roundedRect(margin, yPosition, colWidth, 55, 3, 3, 'F');
        addText(fighter1?.identifier || 'Combattant 1', margin + 5, yPosition + 10, { fontSize: 11, fontStyle: 'bold', color: red });
        addText(`Score Global: ${scores1.overall}/100`, margin + 5, yPosition + 20, { fontSize: 12, fontStyle: 'bold', color: darkGray });
        addText(`Striking: ${scores1.striking}  |  Grappling: ${scores1.grappling}`, margin + 5, yPosition + 30, { fontSize: 9, color: darkGray });
        addText(`Défense: ${scores1.defense}  |  Cardio: ${scores1.cardio}`, margin + 5, yPosition + 38, { fontSize: 9, color: darkGray });
        addText(`Style: ${fighter1?.style || 'N/A'}`, margin + 5, yPosition + 48, { fontSize: 8, color: [100, 100, 100] });

        // Fighter 2 Box
        doc.setFillColor(240, 248, 255);
        doc.roundedRect(margin + colWidth + 20, yPosition, colWidth, 55, 3, 3, 'F');
        addText(fighter2?.identifier || 'Combattant 2', margin + colWidth + 25, yPosition + 10, { fontSize: 11, fontStyle: 'bold', color: blue });
        addText(`Score Global: ${scores2.overall}/100`, margin + colWidth + 25, yPosition + 20, { fontSize: 12, fontStyle: 'bold', color: darkGray });
        addText(`Striking: ${scores2.striking}  |  Grappling: ${scores2.grappling}`, margin + colWidth + 25, yPosition + 30, { fontSize: 9, color: darkGray });
        addText(`Défense: ${scores2.defense}  |  Cardio: ${scores2.cardio}`, margin + colWidth + 25, yPosition + 38, { fontSize: 9, color: darkGray });
        addText(`Style: ${fighter2?.style || 'N/A'}`, margin + colWidth + 25, yPosition + 48, { fontSize: 8, color: [100, 100, 100] });

        yPosition += 65;
      }

      // Statistics
      checkNewPage(100);
      addText('STATISTIQUES DÉTAILLÉES', margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: gold });
      yPosition += 8;
      yPosition = addLine(yPosition, gold);

      const stats1 = analysis.statistics?.fighter_1;
      const stats2 = analysis.statistics?.fighter_2;

      if (stats1 && stats2) {
        // Table header
        doc.setFillColor(50, 50, 55);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Statistique', margin + 5, yPosition + 7);
        doc.text('Rouge', margin + 80, yPosition + 7);
        doc.text('Bleu', margin + 120, yPosition + 7);
        yPosition += 12;

        const statsRows = [
          ['Coups de poing portés', `${stats1.punches_landed}/${stats1.punches_thrown}`, `${stats2.punches_landed}/${stats2.punches_thrown}`],
          ['Coups de pied portés', `${stats1.kicks_landed}/${stats1.kicks_thrown}`, `${stats2.kicks_landed}/${stats2.kicks_thrown}`],
          ['Takedowns réussis', `${stats1.takedowns_successful}/${stats1.takedowns_attempted}`, `${stats2.takedowns_successful}/${stats2.takedowns_attempted}`],
          ['Frappes à la tête', `${stats1.head_strikes}`, `${stats2.head_strikes}`],
          ['Frappes au corps', `${stats1.body_strikes}`, `${stats2.body_strikes}`],
          ['Frappes aux jambes', `${stats1.leg_strikes}`, `${stats2.leg_strikes}`],
          ['Temps au clinch', `${stats1.clinch_time_percent}%`, `${stats2.clinch_time_percent}%`],
          ['Temps au sol', `${stats1.ground_time_percent}%`, `${stats2.ground_time_percent}%`],
          ['Taux de défense', `${stats1.defense_rate}%`, `${stats2.defense_rate}%`],
        ];

        doc.setTextColor(...darkGray);
        doc.setFont('helvetica', 'normal');
        
        statsRows.forEach((row, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 8, 'F');
          }
          doc.text(row[0], margin + 5, yPosition + 3);
          doc.setTextColor(...red);
          doc.text(row[1], margin + 80, yPosition + 3);
          doc.setTextColor(...blue);
          doc.text(row[2], margin + 120, yPosition + 3);
          doc.setTextColor(...darkGray);
          yPosition += 8;
        });

        yPosition += 10;
      }

      // Recommendations
      checkNewPage(80);
      addText('RECOMMANDATIONS D\'ENTRAÎNEMENT', margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: gold });
      yPosition += 8;
      yPosition = addLine(yPosition, gold);

      // Fighter 1 Recommendations
      if (analysis.recommendations?.fighter_1?.length > 0) {
        addText(`${fighter1?.identifier || 'Combattant 1'}:`, margin, yPosition + 5, { fontSize: 11, fontStyle: 'bold', color: red });
        yPosition += 12;
        
        analysis.recommendations.fighter_1.forEach((rec, i) => {
          checkNewPage(15);
          const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, pageWidth - 2 * margin - 10);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkGray);
          doc.text(recLines, margin + 5, yPosition);
          yPosition += recLines.length * 4 + 4;
        });
        yPosition += 5;
      }

      // Fighter 2 Recommendations
      if (analysis.recommendations?.fighter_2?.length > 0) {
        checkNewPage(40);
        addText(`${fighter2?.identifier || 'Combattant 2'}:`, margin, yPosition + 5, { fontSize: 11, fontStyle: 'bold', color: blue });
        yPosition += 12;
        
        analysis.recommendations.fighter_2.forEach((rec, i) => {
          checkNewPage(15);
          const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, pageWidth - 2 * margin - 10);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkGray);
          doc.text(recLines, margin + 5, yPosition);
          yPosition += recLines.length * 4 + 4;
        });
      }

      // Overall Analysis
      if (analysis.overall_analysis) {
        checkNewPage(50);
        yPosition += 10;
        addText('ANALYSE GLOBALE', margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: gold });
        yPosition += 8;
        yPosition = addLine(yPosition, gold);
        
        const analysisLines = doc.splitTextToSize(analysis.overall_analysis, pageWidth - 2 * margin);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkGray);
        doc.text(analysisLines, margin, yPosition);
      }

      // Footer on each page
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(20, 20, 25);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...gold);
        doc.text('KOREV AI - Performance Center', margin, pageHeight - 6);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i}/${totalPages}`, pageWidth - margin - 20, pageHeight - 6);
      }

      // Save the PDF
      const fileName = `analyse-sparring-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF exporté avec succès !');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="gap-2"
      onClick={generatePDF}
      disabled={exporting}
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Exporter PDF
        </>
      )}
    </Button>
  );
};

export default SparringPDFExport;

