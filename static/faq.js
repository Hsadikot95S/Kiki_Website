document.addEventListener('DOMContentLoaded', () => {
    loadFAQ();
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('faq-question')) {
            e.target.classList.toggle('active');
            const answer = e.target.nextElementSibling;
            if (answer.style.display === "block") {
                answer.style.display = "none";
            } else {
                answer.style.display = "block";
            }
        }
    });
});

function loadFAQ() {
    fetch('data/FAQ.docx')
        .then(response => response.arrayBuffer())
        .then(data => mammoth.convertToHtml({arrayBuffer: data}))
        .then(result => {
            const faqSlider = document.getElementById('faq-slider');
            faqSlider.innerHTML = formatFAQ(result.value); // Set the formatted HTML content from the docx file
        })
        .catch(error => console.error('Error loading FAQ file:', error));
}

function formatFAQ(content) {
    // Wrap questions in <h3 class="faq-question"> and answers in <p class="faq-answer">
    return content.replace(/<p>(.*?)<\/p>/g, function (match, p1) {
        if (p1.startsWith('Q:')) {
            return `<div class="faq-item"><h3 class="faq-question">${p1.substring(2).trim()}</h3><p class="faq-answer">`;
        } else if (p1.startsWith('A:')) {
            return `${p1.substring(2).trim()}</p></div>`;
        }
        return match;
    });
}
