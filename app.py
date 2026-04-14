from flask import Flask, render_template, jsonify

app = Flask(__name__)

QUESTIONS = [
    {
        "id": 1,
        "question": "Do you think Mathilde is a victim of society or responsible for her own choices?",
        "options": [
            "A. Entirely a victim of society",
            "B. Mostly a victim but partly responsible",
            "C. Mostly responsible for her own choices",
            "D. Not affected by society at all"
        ],
        "correct": 1,
        "explanation": "Mathilde is shaped by societal expectations but also makes choices driven by pride — she is mostly a victim but bears some responsibility."
    },
    {
        "id": 2,
        "question": "How does Maupassant use Mathilde's desires to criticize social class?",
        "options": [
            "A. By showing wealth as easy to achieve",
            "B. By showing how dangerous obsession with status can be",
            "C. By praising rich lifestyles",
            "D. By ignoring class differences"
        ],
        "correct": 1,
        "explanation": "Maupassant uses Mathilde's obsession with appearing wealthy to warn against the destructive nature of status anxiety."
    },
    {
        "id": 3,
        "question": "In what ways does appearance vs reality shape the outcome?",
        "options": [
            "A. It has no effect",
            "B. It causes Mathilde to become wealthy",
            "C. It leads to the loss and replacement of the necklace",
            "D. It improves her social status permanently"
        ],
        "correct": 2,
        "explanation": "The entire tragedy stems from the gap between appearance and reality — the fake necklace looked real, and Mathilde wanted to appear wealthier than she was."
    },
    {
        "id": 4,
        "question": "Was borrowing the necklace a reasonable decision?",
        "options": [
            "A. Yes, it had no risks",
            "B. Yes, because she needed it to attend",
            "C. No, because it was based on pride and appearance",
            "D. No, because her husband forced her"
        ],
        "correct": 2,
        "explanation": "Borrowing the necklace was motivated by vanity and desire to appear wealthy — a decision rooted in pride rather than necessity."
    },
    {
        "id": 5,
        "question": "How might the story change if Mathilde told the truth immediately?",
        "options": [
            "A. Nothing would change",
            "B. She would still become poor",
            "C. She might have avoided years of hardship",
            "D. She would lose her friend forever"
        ],
        "correct": 2,
        "explanation": "Had Mathilde confessed the loss immediately, Madame Forestier would have revealed the necklace was fake, sparing the Loisels a decade of poverty."
    },
    {
        "id": 6,
        "question": "What does the ending reveal about honesty?",
        "options": [
            "A. Honesty has no value",
            "B. Honesty could have prevented suffering",
            "C. Honesty always leads to punishment",
            "D. Honesty is only important for the rich"
        ],
        "correct": 1,
        "explanation": "The twist ending powerfully shows that a single honest conversation could have prevented ten years of needless suffering."
    },
    {
        "id": 7,
        "question": "Does Mathilde change as a person by the end?",
        "options": [
            "A. No, she stays the same",
            "B. Yes, she becomes more realistic and humble",
            "C. Yes, she becomes wealthier",
            "D. No, she becomes more selfish"
        ],
        "correct": 1,
        "explanation": "By the end Mathilde has been transformed by hardship into a practical, grounded woman — though she still privately mourns her lost beauty and status."
    },
    {
        "id": 8,
        "question": "How does the author use irony in 'The Necklace'?",
        "options": [
            "A. To make the story funny",
            "B. To confuse the reader",
            "C. To highlight the difference between expectation and reality",
            "D. To hide the theme"
        ],
        "correct": 2,
        "explanation": "Maupassant's irony — especially the final twist — perfectly underscores the gap between what characters believe to be true and what actually is."
    },
    {
        "id": 9,
        "question": "What role does Monsieur Loisel play in the story?",
        "options": [
            "A. He is the main cause of the problem",
            "B. He supports Mathilde but also enables her decisions",
            "C. He ignores the situation",
            "D. He creates the conflict alone"
        ],
        "correct": 1,
        "explanation": "Monsieur Loisel is devoted and self-sacrificing, but he also enables Mathilde's vanity by going into debt to replace the necklace without question."
    },
    {
        "id": 10,
        "question": "What is the most important message of 'The Necklace'?",
        "options": [
            "A. Wealth guarantees happiness",
            "B. Appearances are always truthful",
            "C. Pride and materialism can lead to suffering",
            "D. Hard work always leads to success"
        ],
        "correct": 2,
        "explanation": "The story's central theme is that chasing status and appearances — rather than appreciating what one has — leads to ruin."
    }
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/questions')
def get_questions():
    return jsonify(QUESTIONS)

if __name__ == '__main__':
    app.run(debug=True, port=5000)