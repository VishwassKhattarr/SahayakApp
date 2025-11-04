// // let pdfContent;
// // document.addEventListener('DOMContentLoaded', () => {
// //     const form = document.getElementById('content-form');
// //     const statusMessage = document.getElementById('status-message');
// //     const resultSection = document.getElementById('result-section');
// //     const generatedContentDiv = document.getElementById('generated-content');
// //     const downloadPdfBtn = document.getElementById('download-pdf-btn');

// //     form.addEventListener('submit', async (e) => {
// //         e.preventDefault();

// //         const pdfFile = document.getElementById('pdf-upload').files[0];
// //         const contentType = document.querySelector('input[name="content-type"]:checked').value;
// //         const difficulty = document.getElementById('difficulty').value;
        
// //         if (!pdfFile) {
// //             statusMessage.textContent = 'Please select a PDF file.';
// //             statusMessage.style.color = 'red';
// //             return;
// //         }

// //         // 1. Prepare data for the secure Backend API call
// //         const formData = new FormData();
// //         formData.append('pdf', pdfFile);
// //         formData.append('contentType', contentType);
// //         formData.append('difficulty', difficulty);

// //         statusMessage.textContent = 'Processing PDF and generating content...';
// //         statusMessage.style.color = 'orange';
// //         resultSection.classList.add('hidden'); // Hide previous results

// //         try {
// //             // 2. Send request to the Backend endpoint
// //             const response = await fetch('/api/content/generate', {
// //                 method: 'POST',
// //                 // Note: The 'Content-Type' header is usually omitted for FormData; 
// //                 // the browser sets it automatically with the correct boundary.
// //                 body: formData, 
// //             });

// //             if (!response.ok) {
// //                 const errorResult = await response.json();
// //                 throw new Error(errorResult.message || 'Content generation failed on the server.');
// //             }

// //             const result = await response.json();
// //             pdfContent=result;

// //             // 3. Display the result
// //             statusMessage.textContent = 'Content successfully generated!';
// //             statusMessage.style.color = 'green';
            
// //             // Display content (assuming the backend sends back HTML or Markdown)
// //             generatedContentDiv.innerHTML = result.content.replace(/\n/g, '<br>'); // Simple formatting
// //             resultSection.classList.remove('hidden');

// //             // 4. Handle PDF download (Assuming backend provides a URL for the generated PDF)
// //             // For now, we'll just enable the button and set the download content later
// //             // downloadPdfBtn.onclick = () => {
// //             //     // In a real app, you'd fetch the generated PDF file from the server
// //             //     // For this example, we'll just log it.
// //             //     console.log('Downloading PDF...');
// //             //     alert('The actual PDF download function is ready to be linked to the backend endpoint!');
// //             // };
// // //           downloadPdfBtn.onclick = () => {
// // //           // Import jsPDF object (already loaded via CDN in your HTML)
// // //           const { jsPDF } = window.jspdf;
// // //           const pdf = new jsPDF({
// // //            orientation: 'p',
// // //            unit: 'pt',
// // //            format: 'a4'
// // //  });

// // //  // Get the content as plain text, stripping away HTML breaks and tags
// // //           let htmlContent = generatedContentDiv.innerHTML;
// // //           let tmpDiv = document.createElement('div');
// // //           tmpDiv.innerHTML = htmlContent;
// // //           let textContent = tmpDiv.innerText || tmpDiv.textContent || "";

// // //  // Optional: Title for the PDF
// // //           pdf.setFont('helvetica', 'bold');
// // //           pdf.text('Generated Content', 40, 40);
// // //           pdf.setFont('helvetica', 'normal');

// // //  // Word-wrap and print the content
// // //           const leftMargin = 40, topMargin = 70, maxWidth = 520;
// // //           let lines = pdf.splitTextToSize(textContent, maxWidth);
// // //           pdf.text(lines, leftMargin, topMargin);

// // //  // Save/download the PDF
// // //           pdf.save('generated_content.pdf');
// // // };

// // // downloadPdfBtn.onclick = () => {
// // //     // Get the content div
// // //     const content = generatedContentDiv;
// // //     // Set PDF options for quality/spacing
// // //     const opt = {
// // //         margin:       40,                 // Inches, more margin = more whitespace
// // //         filename:     'generated_content.pdf',
// // //         image:        { type: 'jpeg', quality: 0.98 }, // For images if any, keep high
// // //         html2canvas:  { scale: 2 },        // 2 = higher resolution render
// // //         jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
// // //     };
// // //     // This will automatically handle multi-page and basic CSS
// // //     html2pdf().set(opt).from(content).save();
// // // };

// //        downloadPdfBtn.onclick = () => {
// //     // Optionally clone the content into a temporary div for PDF conversion
// //     // (so you can adjust CSS if you wish)
// //     const opt = {
// //         margin:      40, // 40pt ~0.5 inch, suitable for A4
// //         filename:    'generated_content.pdf',
// //         image:       { type: 'jpeg', quality: 0.98 },
// //         html2canvas: { scale: 2 },
// //         jsPDF:       { unit: 'pt', format: 'a4', orientation: 'portrait' }
// //     };
// //     html2pdf().set(opt).from(pdfContent).save().then(() => {
// //         // Remove temp class so browser view stays normal
// //         generatedContentDiv.classList.remove('pdf-full-width');
// //     });
// // };




// //         } catch (error) {
// //             console.error('Generation Error:', error);
// //             statusMessage.textContent = `Error: ${error.message}`;
// //             statusMessage.style.color = 'red';
// //         }
// //     });
// // });



// let pdfContent;
// document.addEventListener('DOMContentLoaded', () => {
//     const form = document.getElementById('content-form');
//     const statusMessage = document.getElementById('status-message');
//     const resultSection = document.getElementById('result-section');
//     const generatedContentDiv = document.getElementById('generated-content');
//     const downloadPdfBtn = document.getElementById('download-pdf-btn');

//     form.addEventListener('submit', async (e) => {
//         e.preventDefault();

//         const pdfFile = document.getElementById('pdf-upload').files[0];
//         const contentType = document.querySelector('input[name="content-type"]:checked').value;
//         const difficulty = document.getElementById('difficulty').value;
        
//         if (!pdfFile) {
//             statusMessage.textContent = 'Please select a PDF file.';
//             statusMessage.style.color = 'red';
//             return;
//         }

//         const formData = new FormData();
//         formData.append('pdf', pdfFile);
//         formData.append('contentType', contentType);
//         formData.append('difficulty', difficulty);

//         statusMessage.textContent = 'Processing PDF and generating content...';
//         statusMessage.style.color = 'orange';
//         resultSection.classList.add('hidden');

//         try {
//             const response = await fetch('/api/content/generate', {
//                 method: 'POST',
//                 body: formData, 
//             });

//             if (!response.ok) {
//                 const errorResult = await response.json();
//                 throw new Error(errorResult.message || 'Content generation failed on the server.');
//             }

//             const result = await response.json();
//             pdfContent = result;

//             statusMessage.textContent = 'Content successfully generated!';
//             statusMessage.style.color = 'green';
            
//             generatedContentDiv.innerHTML = result.content.replace(/\n/g, '<br>');
//             resultSection.classList.remove('hidden');

//             // Download button - use pdfContent from backend response
//             downloadPdfBtn.onclick = () => {
//                 downloadPdfFromContent();
//             };

//         } catch (error) {
//             console.error('Generation Error:', error);
//             statusMessage.textContent = "this is the error";
//             statusMessage.style.color = 'red';
//         }
//     });

//     // Function to download PDF using pdfContent
//     function downloadPdfFromContent() {
//         if (!pdfContent || !pdfContent.pdfData) {
//             alert('PDF content not available. Please generate content first.');
//             return;
//         }

//         try {
//             // If pdfContent.pdfData is a base64 string
//             if (typeof pdfContent.pdfData === 'string') {
//                 const byteCharacters = atob(pdfContent.pdfData);
//                 const byteNumbers = new Array(byteCharacters.length);
//                 for (let i = 0; i < byteCharacters.length; i++) {
//                     byteNumbers[i] = byteCharacters.charCodeAt(i);
//                 }
//                 const byteArray = new Uint8Array(byteNumbers);
//                 const blob = new Blob([byteArray], { type: 'application/pdf' });
//                 downloadBlob(blob);
//             } 
//             // If pdfContent.pdfData is already a Blob or ArrayBuffer
//             else if (pdfContent.pdfData instanceof Blob) {
//                 downloadBlob(pdfContent.pdfData);
//             }
//             // If pdfContent.pdfUrl is provided by backend
//             else if (pdfContent.pdfUrl) {
//                 window.open(pdfContent.pdfUrl, '_blank');
//             }
//             else {
//                 alert('PDF format not recognized.');
//             }
//         } catch (error) {
//             console.error('PDF Download Error:', error);
//             alert('Failed to download PDF: ' + error.message);
//         }
//     }

//     // Helper function to trigger download
//     function downloadBlob(blob) {
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = pdfContent.filename || 'generated_content.pdf';
//         document.body.appendChild(a);
//         a.click();
//         window.URL.revokeObjectURL(url);
//         document.body.removeChild(a);
//     }
// });



let pdfContent;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('content-form');
    const statusMessage = document.getElementById('status-message');
    const resultSection = document.getElementById('result-section');
    const generatedContentDiv = document.getElementById('generated-content');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pdfFile = document.getElementById('pdf-upload').files[0];
        const contentType = document.querySelector('input[name="content-type"]:checked').value;
        const difficulty = document.getElementById('difficulty').value;
        
        if (!pdfFile) {
            statusMessage.textContent = 'Please select a PDF file.';
            statusMessage.style.color = 'red';
            return;
        }

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('contentType', contentType);
        formData.append('difficulty', difficulty);

        statusMessage.textContent = 'Processing PDF and generating content...';
        statusMessage.style.color = 'orange';
        resultSection.classList.add('hidden');

        try {
            const response = await fetch('/api/content/generate', {
                method: 'POST',
                body: formData, 
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Content generation failed on the server.');
            }

            const result = await response.json();
            pdfContent = result;

            statusMessage.textContent = 'Content successfully generated!';
            statusMessage.style.color = 'green';
            
            generatedContentDiv.innerHTML = result.content.replace(/\n/g, '<br>');
            resultSection.classList.remove('hidden');

            // Download button - generate PDF from content
            downloadPdfBtn.onclick = () => {
                generateAndDownloadPdf();
            };

        } catch (error) {
            console.error('Generation Error:', error);
            statusMessage.textContent ="error aara bhai";
            statusMessage.style.color = 'red';
        }
    });

    // Function to generate PDF from the displayed content
    function generateAndDownloadPdf() {
        if (!pdfContent || !pdfContent.content) {
            alert('No content available to download.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            // Get plain text from the generated content
            const textContent = pdfContent.content;

            // Set up PDF with title
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.text('Generated Content', 20, 20);

            // Add the content
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);

            // Split text to fit page width and handle multiple pages
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pageWidth - 2 * margin;
            const lineHeight = 7;
            let yPosition = 40;

            const lines = pdf.splitTextToSize(textContent, maxWidth);

            lines.forEach((line) => {
                if (yPosition > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                }
                pdf.text(line, margin, yPosition);
                yPosition += lineHeight;
            });

            // Download the PDF
            pdf.save('generated_content.pdf');
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF: ' + error.message);
        }
    }
});