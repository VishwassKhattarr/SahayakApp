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

        // 1. Prepare data for the secure Backend API call
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('contentType', contentType);
        formData.append('difficulty', difficulty);

        statusMessage.textContent = 'Processing PDF and generating content...';
        statusMessage.style.color = 'orange';
        resultSection.classList.add('hidden'); // Hide previous results

        try {
            // 2. Send request to the Backend endpoint
            const response = await fetch('/api/content/generate', {
                method: 'POST',
                // Note: The 'Content-Type' header is usually omitted for FormData; 
                // the browser sets it automatically with the correct boundary.
                body: formData, 
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Content generation failed on the server.');
            }

            const result = await response.json();
            pdfContent=result;

            // 3. Display the result
            statusMessage.textContent = 'Content successfully generated!';
            statusMessage.style.color = 'green';
            
            // Display content (assuming the backend sends back HTML or Markdown)
            generatedContentDiv.innerHTML = result.content.replace(/\n/g, '<br>'); // Simple formatting
            resultSection.classList.remove('hidden');

            // 4. Handle PDF download (Assuming backend provides a URL for the generated PDF)
            // For now, we'll just enable the button and set the download content later
            // downloadPdfBtn.onclick = () => {
            //     // In a real app, you'd fetch the generated PDF file from the server
            //     // For this example, we'll just log it.
            //     console.log('Downloading PDF...');
            //     alert('The actual PDF download function is ready to be linked to the backend endpoint!');
            // };
//           downloadPdfBtn.onclick = () => {
//           // Import jsPDF object (already loaded via CDN in your HTML)
//           const { jsPDF } = window.jspdf;
//           const pdf = new jsPDF({
//            orientation: 'p',
//            unit: 'pt',
//            format: 'a4'
//  });

//  // Get the content as plain text, stripping away HTML breaks and tags
//           let htmlContent = generatedContentDiv.innerHTML;
//           let tmpDiv = document.createElement('div');
//           tmpDiv.innerHTML = htmlContent;
//           let textContent = tmpDiv.innerText || tmpDiv.textContent || "";

//  // Optional: Title for the PDF
//           pdf.setFont('helvetica', 'bold');
//           pdf.text('Generated Content', 40, 40);
//           pdf.setFont('helvetica', 'normal');

//  // Word-wrap and print the content
//           const leftMargin = 40, topMargin = 70, maxWidth = 520;
//           let lines = pdf.splitTextToSize(textContent, maxWidth);
//           pdf.text(lines, leftMargin, topMargin);

//  // Save/download the PDF
//           pdf.save('generated_content.pdf');
// };

// downloadPdfBtn.onclick = () => {
//     // Get the content div
//     const content = generatedContentDiv;
//     // Set PDF options for quality/spacing
//     const opt = {
//         margin:       40,                 // Inches, more margin = more whitespace
//         filename:     'generated_content.pdf',
//         image:        { type: 'jpeg', quality: 0.98 }, // For images if any, keep high
//         html2canvas:  { scale: 2 },        // 2 = higher resolution render
//         jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
//     };
//     // This will automatically handle multi-page and basic CSS
//     html2pdf().set(opt).from(content).save();
// };

       downloadPdfBtn.onclick = () => {
    // Optionally clone the content into a temporary div for PDF conversion
    // (so you can adjust CSS if you wish)
    const opt = {
        margin:      40, // 40pt ~0.5 inch, suitable for A4
        filename:    'generated_content.pdf',
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF:       { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(generatedContentDiv).save().then(() => {
        // Remove temp class so browser view stays normal
        generatedContentDiv.classList.remove('pdf-full-width');
    });
};




        } catch (error) {
            console.error('Generation Error:', error);
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.style.color = 'red';
        }
    });
});