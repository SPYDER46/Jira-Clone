import os
import psycopg2
from flask import Flask, request, jsonify, send_file, render_template
from werkzeug.utils import secure_filename
from io import BytesIO

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # max 16MB upload

# DB connection info — replace with your credentials
DB_HOST = 'localhost'
DB_NAME = 'JiraCloneDB'
DB_USER = 'postgres'
DB_PASS = 'root'

def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

@app.route('/')
def index():
    return render_template('Dashboard.html')

@app.route('/submit_ticket', methods=['POST'])
def submit_ticket():
    data = request.form
    project = data.get('project')
    work_type = data.get('workType')
    status = data.get('status')
    summary = data.get('summary')
    description = data.get('description')
    assignee = data.get('assignee')
    team = data.get('team')
    game_name = data.get('gameName')

    try:
        conn = get_db_conn()
        cur = conn.cursor()

        # Insert ticket without attachment
        cur.execute(
            """
            INSERT INTO tickets 
            (project, work_type, status, summary, description, assignee, team, game_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (project, work_type, status, summary, description, assignee, team, game_name))
        ticket_id = cur.fetchone()[0]

        files = request.files.getlist('attachment')  
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                data = file.read()
                cur.execute(
                    "INSERT INTO ticket_attachments (ticket_id, filename, data) VALUES (%s, %s, %s)",
                    (ticket_id, filename, data)
                )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Ticket created', 'ticket_id': ticket_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_tickets', methods=['GET'])
def get_tickets():
    conn = get_db_conn()
    cur = conn.cursor()

    # Main ticket query
    cur.execute("SELECT id, summary, project, work_type, status, description, assignee, team, game_name FROM tickets")
    tickets = cur.fetchall()

    ticket_list = []
    for row in tickets:
        ticket = {
            'id': row[0],
            'summary': row[1],
            'project': row[2],
            'work_type': row[3],
            'status': row[4],
            'description': row[5],
            'assignee': row[6],
            'team': row[7],
            'game_name': row[8],
            'attachments': []
        }

        # Fetch attachments for this ticket
        cur.execute("SELECT id, filename FROM ticket_attachments WHERE ticket_id = %s", (ticket['id'],))
        attachments = cur.fetchall()
        ticket['attachments'] = [{'id': a[0], 'filename': a[1]} for a in attachments]

        ticket_list.append(ticket)

    cur.close()
    conn.close()
    return jsonify(ticket_list)

@app.route('/invite_user', methods=['POST'])
def invite_user():
    data = request.json
    name = data.get('name')
    role = data.get('role')
    email = data.get('email')

    if not all([name, role, email]):
        return jsonify({'error': 'Missing fields'}), 400

    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO invites (name, role, email) VALUES (%s, %s, %s) RETURNING id",
            (name, role, email)
        )
        invite_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        # You can add email sending logic here if needed
        return jsonify({'message': 'User invited', 'invite_id': invite_id}), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({'error': 'Email already invited'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ticket_attachment/<int:ticket_id>', methods=['GET'])
def ticket_attachment(ticket_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT attachment, attachment_filename FROM tickets WHERE id = %s", (ticket_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row or not row[0]:
            return jsonify({'error': 'No attachment found'}), 404

        attachment_data, filename = row
        return send_file(
            BytesIO(attachment_data),
            download_name=filename,  
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/upload_attachment/<int:ticket_id>', methods=['POST'])
def upload_attachment(ticket_id):
    try:
        files = request.files.getlist('attachments')
        conn = get_db_conn()
        cur = conn.cursor()

        inserted_ids = []
        for file in files:
            if file.filename:
                data = file.read()
                filename = secure_filename(file.filename)
                cur.execute(
                    "INSERT INTO ticket_attachments (ticket_id, filename, data) VALUES (%s, %s, %s) RETURNING id",
                    (ticket_id, filename, data)
                )
                new_id = cur.fetchone()[0]
                inserted_ids.append(new_id)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'status': 'ok', 'inserted_ids': inserted_ids})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/attachment/<int:attachment_id>', methods=['GET'])
def get_attachment(attachment_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT data, filename FROM ticket_attachments WHERE id = %s", (attachment_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({'error': 'Attachment not found'}), 404

        data, filename = row
        return send_file(
            BytesIO(data),
            download_name=filename,
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/update_ticket/<int:ticket_id>', methods=['POST'])
def update_ticket(ticket_id):
    if request.content_type.startswith('multipart/form-data'):
        attachment = request.files.get('newAttachment')
        if not attachment:
            return jsonify({'error': 'No attachment file provided'}), 400

        filename = secure_filename(attachment.filename)
        data = attachment.read()

        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ticket_attachments (ticket_id, filename, data) VALUES (%s, %s, %s)",
            (ticket_id, filename, data)
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Attachment saved'}), 200

    # Otherwise, it's a normal JSON update
    data = request.json or {}
    fields = ['summary','project','work_type','status','description','assignee','team','game_name']
    updates, params = [], []
    for f in fields:
        if f in data:
            updates.append(f"{f} = %s")
            params.append(data[f])
    if updates:
        params.append(ticket_id)
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE tickets SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        cur.close()
        conn.close()
    return jsonify({'message': 'Ticket updated'}), 200


@app.route('/delete_attachment/<int:attachment_id>', methods=['DELETE'])
def delete_attachment(attachment_id):
    print(f"Delete request received for attachment: {attachment_id}")
    try:
        conn = get_db_conn()
        cur = conn.cursor()

        # Optional: Check if attachment exists first
        cur.execute("SELECT id FROM ticket_attachments WHERE id = %s", (attachment_id,))
        if cur.fetchone() is None:
            cur.close()
            conn.close()
            return jsonify({'error': 'Attachment not found'}), 404

        # Delete the attachment
        cur.execute("DELETE FROM ticket_attachments WHERE id = %s", (attachment_id,))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Attachment deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
