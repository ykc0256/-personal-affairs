from src.db.connection import query


def main():
    rows = query("SELECT current_user, current_database(), now();")
    for row in rows:
        print(row)


if __name__ == "__main__":
    main()
