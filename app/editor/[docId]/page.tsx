


// return (
//     <div className="min-h-screen bg-background p-6">
//       <div className="max-w-6xl mx-auto">
//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <Button
//               variant="outline"
//               onClick={() => setCurrentDocument(null)}
//               className="mb-2"
//             >
//               ← Back to Documents
//             </Button>
//             <h1 className="text-2xl font-bold">
//               {currentDoc?.title || "Untitled Document"}
//             </h1>
//           </div>
//         </div>

//         <CollaborativeEditor
//           documentId={currentDocument}
//           currentUser={currentUser}
//           activeUsers={activeUsers}
//           onShare={() => setShareModalOpen(true)}
//           onShowUsers={() => setUsersModalOpen(true)}
//           onDownload={() => setDownloadModalOpen(true)}
//           onGenerateAI={() => setAIGenerateModalOpen(true)}
//         />

//         <ShareModal
//           isOpen={shareModalOpen}
//           onClose={() => setShareModalOpen(false)}
//           documentId={currentDocument}
//         />

//         <DownloadModal
//           isOpen={downloadModalOpen}
//           onClose={() => setDownloadModalOpen(false)}
//           documentId={currentDocument}
//           editorContent={currentDocumentContent}
//         />

//         <AIGenerateModal
//           isOpen={aiGenerateModalOpen}
//           onClose={() => setAIGenerateModalOpen(false)}
//           documentTitle={currentDoc?.title || "Untitled Document"}
//           onGenerate={handleAIGenerate}
//         />

//         <UsersModal
//           isOpen={usersModalOpen}
//           onClose={() => setUsersModalOpen(false)}
//           activeUsers={activeUsers}
//           currentUserId={currentUser?.id}
//         />
//       </div>
//     </div>
//   );
