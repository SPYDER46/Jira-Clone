from flask import Flask, request, render_template, redirect, jsonify, send_file
import psycopg2
import os
import io


app = Flask(__name__)

def get_db_conn():
    return psycopg2.connect(
        host='localhost',
        database='JiraCloneDB',
        user='postgres',
        password='root'
    )

@app.route('/')
def index():
    return render_template('Dashboard.html')

@app.route('/submit_ticket', methods=['POST'])
def submit_ticket():
    data = request.form
    files = request.files.getlist("attachment")  # Support multiple files

    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO tickets (project, work_type, status, description, assignee, team, game_name, summary)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, summary, project
    """, (
        data['project'],
        data['workType'],
        data['status'],
        data['description'],
        data['assignee'],
        data['team'],
        data['gameName'],
        data.get('summary', '')  
    ))

    ticket = cur.fetchone()
    ticket_id = ticket[0]

    for file in files:
        if file:
            cur.execute("""
                INSERT INTO ticket_attachments (ticket_id, filename, data)
                VALUES (%s, %s, %s)
            """, (ticket_id, file.filename, file.read()))

    conn.commit()
    cur.close()
    conn.close()

    # Return the created ticket info so frontend can display it
    return jsonify({
    "success": True,
    "ticket": {
        "id": ticket_id,
        "summary": data.get('summary', ''),
        "project": data.get('project', ''),
        "status": data.get('status', 'To Do'),  
        "workType": data.get('workType', ''),
        "gameName": data.get('gameName', '')
    }
})

@app.route('/get_tickets', methods=['GET'])
def get_tickets():
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, project, work_type, status, description, assignee, team, game_name, created_at, summary
            FROM tickets
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        tickets = []
        for row in rows:
            ticket = {
                "id": row[0],
                "project": row[1],
                "workType": row[2],
                "status": row[3],
                "description": row[4],
                "assignee": row[5],
                "team": row[6],
                "gameName": row[7],
                "createdAt": row[8].isoformat() if row[8] else None,
                "summary": row[9]
            }
            tickets.append(ticket)

        return jsonify(tickets)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/update_ticket', methods=['POST'])
def update_ticket():
    data = request.get_json()
    ticket_id = data.get('id')
    if not ticket_id:
        return jsonify({"success": False, "error": "Ticket ID required"}), 400

    # Extract fields with default to None if missing
    project = data.get('project')
    work_type = data.get('type') or data.get('workType')
    status = data.get('status')
    description = data.get('description')
    assignee = data.get('assignee')
    team = data.get('team')
    game_name = data.get('game') or data.get('gameName')
    summary = data.get('summary')  # You might want to store summary separately or map it

    # Example: Update fields you want
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE tickets SET
            project=%s,
            work_type=%s,
            status=%s,
            description=%s,
            assignee=%s,
            team=%s,
            game_name=%s
        WHERE id=%s
    """, (project, work_type, status, description, assignee, team, game_name, ticket_id))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

@app.route('/add_attachments/<int:ticket_id>', methods=['POST'])
def add_attachments(ticket_id):
    files = request.files.getlist('newAttachments')

    if not files:
        return jsonify({"success": False, "error": "No files uploaded"}), 400

    conn = get_db_conn()
    cur = conn.cursor()

    # Optionally verify ticket exists first
    cur.execute("SELECT 1 FROM tickets WHERE id=%s", (ticket_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"success": False, "error": "Ticket not found"}), 404

    for file in files:
        if file:
            cur.execute("""
                INSERT INTO ticket_attachments (ticket_id, filename, data)
                VALUES (%s, %s, %s)
            """, (ticket_id, file.filename, file.read()))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"success": True})


@app.route('/attachment/<int:attachment_id>')
def get_attachment(attachment_id):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT filename, data FROM ticket_attachments WHERE id = %s", (attachment_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return "Attachment not found", 404

    filename, data = row
    return send_file(
        io.BytesIO(data),
        download_name=filename,
        as_attachment=True
    )

if __name__ == '__main__':
    app.run(debug=True)
