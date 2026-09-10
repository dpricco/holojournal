import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJournalSessionInitialContext, getLastSynthesisDate, getUnsynthesizedLogs, createAndPopulateDoc, generateNextVersionFilename } from '../services/driveDocsService';
import { processSynthesis } from '../services/geminiService';

export const Synthesis: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const navigate = useNavigate();

  const handleSynthesize = async () => {
    setIsProcessing(true);
    try {
      setStatusText('FETCHING LAST SYNTHESIS DATE...');
      const lastDate = await getLastSynthesisDate();
      
      setStatusText('GATHERING RECENT LOGS...');
      const logs = await getUnsynthesizedLogs(lastDate);
      
      if (!logs.trim()) {
        alert('NO NEW LOGS FOUND SINCE LAST SYNTHESIS.');
        setIsProcessing(false);
        setStatusText('');
        return;
      }

      setStatusText('FETCHING SYSTEM DIRECTIVES...');
      const systemContext = await getJournalSessionInitialContext();

      setStatusText('AI SYNTHESIS IN PROGRESS...');
      const bioText = systemContext.biographyDoc?.text || '';
      const result = await processSynthesis(systemContext.combinedSystemInstruction, logs, bioText);

      if (result && result.synthesisDoc) {
        setStatusText('SAVING SYNTHESIS TO DATABANKS...');
        
        const dateStr = new Date().toISOString().split('T')[0];
        const title = `Holojournal-Synthesis-${dateStr}`; // YYYY-MM-DD
        
        const docId = await createAndPopulateDoc(title, result.synthesisDoc);
        
        if (docId) {
          // Check if biography was updated
          if (result.revisedBiographyDoc && systemContext.biographyDoc?.name) {
            setStatusText('UPDATING MASTER BIOGRAPHY...');
            const newBioName = generateNextVersionFilename(systemContext.biographyDoc.name);
            await createAndPopulateDoc(newBioName, result.revisedBiographyDoc);
            alert(`SYNTHESIS COMPLETE AND SAVED.\nBiography updated as: ${newBioName}`);
          } else {
            alert('SYNTHESIS COMPLETE AND SAVED.');
          }
          navigate('/');
        } else {
          alert('UPLOAD FAILED.');
        }
      } else {
        alert('SYNTHESIS FAILED TO GENERATE.');
      }
    } catch (error) {
      console.error(error);
      alert('SYSTEM ERROR DURING SYNTHESIS.');
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-lcars-blue text-3xl border-b-4 border-lcars-blue pb-2">SYNTHESIS</h2>
      
      <div className="flex-1 bg-black p-4 border-l-4 border-lcars-purple flex flex-col justify-center items-center text-center space-y-8">
        
        <p className="text-lcars-peach text-xl max-w-xl">
          INITIATING THIS PROTOCOL WILL COMPILE ALL JOURNAL ENTRIES AND COUNCIL SESSIONS SINCE THE PREVIOUS SYNTHESIS. THE AI WILL CONDENSE THEM INTO A MASTER SYNTHESIS REPORT.
        </p>

        {isProcessing ? (
          <div className="text-lcars-yellow text-2xl animate-pulse font-bold">
            {statusText}
          </div>
        ) : (
          <button 
            onClick={handleSynthesize}
            className="px-12 py-6 bg-lcars-purple hover:bg-lcars-yellow text-black rounded-full font-bold text-3xl transition-all"
          >
            EXECUTE SYNTHESIS
          </button>
        )}
      </div>
      
      <div className="bg-black p-4 border-t-4 border-lcars-purple flex justify-end">
         <button 
            onClick={() => navigate('/')}
            disabled={isProcessing}
            className="px-6 py-4 bg-lcars-red hover:bg-lcars-yellow text-black rounded-full transition-all font-bold text-xl disabled:opacity-50"
          >
            CANCEL
          </button>
      </div>
    </div>
  );
};
