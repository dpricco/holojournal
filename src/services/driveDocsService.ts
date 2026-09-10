// Always use window.gapi — it has the loaded discovery docs (Drive v3, Docs v1)
// and the OAuth access token set by GIS. The npm `gapi-script` stub does not.
const gapiClient = () => (window as any).gapi?.client as any;

export interface DocFile {
  id: string;
  name: string;
}

export const findFilesByName = async (nameQuery: string): Promise<DocFile[]> => {
  try {
    const response = await gapiClient().drive.files.list({
      q: `name contains '${nameQuery}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name desc', // sorts versions descending
    });
    return response.result.files as DocFile[] || [];
  } catch (error) {
    console.error(`Error finding files for query ${nameQuery}:`, error);
    return [];
  }
};

export const getDocText = async (documentId: string): Promise<string> => {
  try {
    const response = await gapiClient().docs.documents.get({
      documentId: documentId,
    });
    
    let text = '';
    const content = response.result.body?.content;
    if (content) {
      content.forEach((element: any) => {
        if (element.paragraph && element.paragraph.elements) {
          element.paragraph.elements.forEach((el: any) => {
            if (el.textRun && el.textRun.content) {
              text += el.textRun.content;
            }
          });
        }
      });
    }
    return text;
  } catch (error) {
    console.error(`Error getting doc text for ID ${documentId}:`, error);
    return '';
  }
};

function extractVersion(filename: string): number[] {
  // Matches e.g. v1.2, v0.10, v2, 1.2.3, etc.
  const match = filename.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1] || '0', 10),
    parseInt(match[2] || '0', 10),
    parseInt(match[3] || '0', 10)
  ];
}

function compareVersions(fileA: DocFile, fileB: DocFile): number {
  const vA = extractVersion(fileA.name);
  const vB = extractVersion(fileB.name);
  for (let i = 0; i < 3; i++) {
    if (vA[i] !== vB[i]) {
      return vB[i] - vA[i]; // descending order: highest version first
    }
  }
  return fileB.name.localeCompare(fileA.name);
}

export const generateNextVersionFilename = (filename: string): string => {
  const match = filename.match(/(.*?)(v?\d+(?:\.\d+)?(?:\.\d+)?)(.*)/i);
  if (!match) {
    return `${filename}-v1.1`;
  }
  const prefix = match[1];
  const verStr = match[2];
  const suffix = match[3];

  const verMatch = verStr.match(/(v?)(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!verMatch) return `${filename}-v1.1`;

  const vPrefix = verMatch[1] || 'v';
  const major = parseInt(verMatch[2], 10);
  const minorStr = verMatch[3];
  
  if (minorStr !== undefined) {
    const minor = parseInt(minorStr, 10);
    return `${prefix}${vPrefix}${major}.${minor + 1}${suffix}`;
  } else {
    return `${prefix}${vPrefix}${major}.1${suffix}`;
  }
};

export const getLatestDocContent = async (nameQuery: string): Promise<{ name: string; id: string; text: string } | null> => {
  try {
    const files = await findFilesByName(nameQuery);
    if (files.length === 0) return null;
    const sorted = [...files].sort(compareVersions);
    const latest = sorted[0];
    const text = await getDocText(latest.id);
    return { name: latest.name, id: latest.id, text };
  } catch (error) {
    console.error(`Error fetching latest content for ${nameQuery}:`, error);
    return null;
  }
};

export const getJournalSessionInitialContext = async (): Promise<{
  workflowDoc: { name: string; id: string; text: string } | null;
  biographyDoc: { name: string; id: string; text: string } | null;
  promptingDoc: { name: string; id: string; text: string } | null;
  recentJournals: { name: string; text: string }[];
  combinedSystemInstruction: string;
}> => {
  const [workflow, biography, prompting] = await Promise.all([
    getLatestDocContent('Holojournal-workflow'),
    getLatestDocContent('Holojournal-biography'),
    getLatestDocContent('Holojournal-journalprompting')
  ]);

  // Fetch up to 3 recent journal entries
  let recentJournals: { name: string; text: string }[] = [];
  try {
    const response = await gapiClient().drive.files.list({
      q: `name contains 'Holojournal-Journal-' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc',
      pageSize: 3,
    });
    const files = (response.result.files || []) as DocFile[];
    for (const f of files) {
      const text = await getDocText(f.id);
      recentJournals.push({ name: f.name, text });
    }
  } catch (e) {
    console.error('Error loading recent journal entries:', e);
  }

  let combinedSystemInstruction = `You are the Holojournal AI, an intelligent, empathetic, and philosophically grounded personal journaling companion.\n`;
  if (workflow) {
    combinedSystemInstruction += `\n=== WORKFLOW DIRECTIVE (${workflow.name}) ===\n${workflow.text}\n`;
  }
  if (biography) {
    combinedSystemInstruction += `\n=== USER MASTER BIOGRAPHY & CORE VALUES (${biography.name}) ===\n${biography.text}\n`;
  }
  if (recentJournals.length > 0) {
    combinedSystemInstruction += `\n=== PREVIOUS JOURNAL ENTRIES (MOST RECENT CONTEXT) ===\n`;
    for (const j of recentJournals) {
      combinedSystemInstruction += `\n--- Past Entry: ${j.name} ---\n${j.text}\n`;
    }
  }

  return {
    workflowDoc: workflow ? { name: workflow.name, id: workflow.id, text: workflow.text } : null,
    biographyDoc: biography ? { name: biography.name, id: biography.id, text: biography.text } : null,
    promptingDoc: prompting ? { name: prompting.name, id: prompting.id, text: prompting.text } : null,
    recentJournals,
    combinedSystemInstruction
  };
};
export const getLatestSystemDocsContext = async (): Promise<{ combinedText: string; loadedDocs: {name: string; id: string}[] }> => {
  const docTypes = ['Holojournal-workflow-doc', 'Holojournal-journalprompting', 'Holojournal-biography', 'Holojournal-councilpersonas'];
  let combinedContext = '';
  const loadedDocs: {name: string; id: string}[] = [];

  for (const docType of docTypes) {
    const files = await findFilesByName(docType);
    if (files.length > 0) {
      // Sort by extracted version number descending
      const sorted = [...files].sort(compareVersions);
      const latestFile = sorted[0];
      const text = await getDocText(latestFile.id);
      combinedContext += `\n\n--- [SYSTEM DIRECTIVE: ${latestFile.name}] ---\n${text}`;
      loadedDocs.push({ name: latestFile.name, id: latestFile.id });
    } else {
      console.warn(`Could not find ${docType} in Google Drive`);
    }
  }

  return { combinedText: combinedContext, loadedDocs };
};

export const getRecentJournalEntriesContext = async (count: number = 3): Promise<string> => {
  try {
    const response = await gapiClient().drive.files.list({
      q: `name contains 'Holojournal-Journal-' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc',
      pageSize: count,
    });
    
    const files = response.result.files as DocFile[] || [];
    let recentContext = '';
    
    for (const file of files) {
      const text = await getDocText(file.id);
      recentContext += `\n\n--- Past Entry: ${file.name} ---\n${text}`;
    }
    
    return recentContext;
  } catch (error) {
    console.error('Error fetching recent journal entries:', error);
    return '';
  }
};

export const getLastSynthesisDate = async (): Promise<string | null> => {
  try {
    const response = await gapiClient().drive.files.list({
      q: `name contains 'Holojournal-Synthesis-' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 1,
    });
    const files = response.result.files || [];
    if (files.length > 0) {
      return files[0].createdTime;
    }
    return null;
  } catch (error) {
    console.error('Error finding last synthesis date:', error);
    return null;
  }
};

export const getUnsynthesizedLogs = async (sinceDate: string | null): Promise<string> => {
  try {
    let q = `(name contains 'Holojournal-Journal-' or name contains 'Holojournal-Council-') and mimeType='application/vnd.google-apps.document' and trashed=false`;
    if (sinceDate) {
      q += ` and createdTime > '${sinceDate}'`;
    }

    const response = await gapiClient().drive.files.list({
      q: q,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime asc', // chronological order
    });
    
    const files = response.result.files || [];
    let compiledLogs = '';
    
    for (const file of files) {
      const text = await getDocText(file.id);
      compiledLogs += `\n\n=== FILE: ${file.name} (Created: ${file.createdTime}) ===\n${text}`;
    }
    
    return compiledLogs;
  } catch (error) {
    console.error('Error fetching unsynthesized logs:', error);
    return '';
  }
};

export const createAndPopulateDoc = async (title: string, textContent: string): Promise<string | null> => {
  try {
    const createResponse = await gapiClient().docs.documents.create({
      resource: { title }
    });
    
    const documentId = createResponse.result.documentId;
    if (!documentId) return null;

    await gapiClient().docs.documents.batchUpdate({
      documentId: documentId,
      resource: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: textContent
            }
          }
        ]
      }
    });

    return documentId;
  } catch (error: any) {
    console.error('Error creating document:', error);
    throw new Error(error?.result?.error?.message || error?.message || 'Unknown Docs API error');
  }
};

export const appendToBiography = async (insightText: string): Promise<boolean> => {
  if (insightText === "None") return true;

  try {
    const files = await findFilesByName('Holojournal-biography');
    if (files.length === 0) return false;
    
    const bioId = files[0].id;
    
    // We need to find the end of the document to append
    const doc = await gapiClient().docs.documents.get({ documentId: bioId });
    const content = doc.result.body?.content;
    const lastElement = content ? content[content.length - 1] : null;
    const endIndex = lastElement ? (lastElement.endIndex ? lastElement.endIndex - 1 : 1) : 1;

    await gapiClient().docs.documents.batchUpdate({
      documentId: bioId,
      resource: {
        requests: [
          {
            insertText: {
              location: { index: endIndex },
              text: `\n[${new Date().toISOString().split('T')[0]}] New Insight:\n${insightText}\n`
            }
          }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error('Error appending to biography:', error);
    return false;
  }
};

export const getJournalEntriesCount = async (): Promise<number> => {
  try {
    const response = await gapiClient().drive.files.list({
      q: `name contains 'Holojournal-Journal-' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id)',
      pageSize: 10,
    });
    return (response.result.files || []).length;
  } catch (error) {
    console.error('Error counting journal entries:', error);
    return 0;
  }
};

export const initializeBiographyAndFirstEntry = async (
  backgroundHistory: string,
  coreValues: string
): Promise<{ bioDocId: string | null; firstEntryId: string | null }> => {
  try {
    // 1. Locate or create Holojournal-biography
    const bioFiles = await findFilesByName('Holojournal-biography');
    let bioDocId: string | null = null;
    const initialBioContent = `HOLOJOURNAL MASTER BIOGRAPHY & CORE VALUES\nINITIALIZED: ${new Date().toISOString()}\n\n=== BACKGROUND HISTORY ===\n${backgroundHistory}\n\n=== CORE VALUES & DIRECTIVES ===\n${coreValues}\n\n=== CHRONOLOGICAL INSIGHTS LOG ===\n`;

    if (bioFiles.length > 0) {
      bioDocId = bioFiles[0].id;
      // Append to existing
      await gapiClient().docs.documents.batchUpdate({
        documentId: bioDocId,
        resource: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: initialBioContent
              }
            }
          ]
        }
      });
    } else {
      bioDocId = await createAndPopulateDoc('Holojournal-biography', initialBioContent);
    }

    // 2. Generate inaugural journal entry
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);
    const firstTitle = `Holojournal-Journal-${dateStr}-${timeStr}`;

    const inauguralEntryContent = JSON.stringify({
      categorized_session_record: {
        theme: "System Inauguration & Foundational Baseline",
        user_narrative: `Inaugural baseline recorded. Background and core values initialized:\n${backgroundHistory.substring(0, 200)}...`,
        emotional_state: "Calibrated / Ready for Journey"
      },
      insight_synthesizer: {
        primary_realization: "Personal baseline successfully anchored into the Holodeck bio-databanks.",
        actionable_recommendations: [
          "Engage in daily reflection logs to track longitudinal shifts.",
          "Consult the Council Chamber when wrestling with complex decisions."
        ]
      },
      biographical_append: `Inaugural profile calibrated with core values: ${coreValues.split('\n')[0] || 'Integrity'}`
    }, null, 2);

    const firstEntryId = await createAndPopulateDoc(firstTitle, inauguralEntryContent);

    return { bioDocId, firstEntryId };
  } catch (err) {
    console.error('Error during onboarding initialization:', err);
    return { bioDocId: null, firstEntryId: null };
  }
};


