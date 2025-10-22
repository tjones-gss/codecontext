      *****************************************************************
      * PROGRAM: SCR100 - Customer Account Screen Handler
      * AUTHOR: John Smith
      * DATE: 2024-01-15
      * PURPOSE: Main screen handler for customer account management
      *          Processes customer inquiries and updates
      *****************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SCR100.

       ENVIRONMENT DIVISION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.

       01  WS-CUSTOMER-RECORD.
           05  WS-CUST-ID           PIC 9(10).
           05  WS-CUST-NAME         PIC X(50).
           05  WS-CUST-ADDRESS      PIC X(100).
           05  WS-CUST-BALANCE      PIC 9(9)V99.

       01  WS-RETURN-CODE          PIC 9(2).
       01  WS-ERROR-MESSAGE        PIC X(80).

       01  WS-SCREEN-FLAGS.
           05  WS-FIRST-TIME        PIC X VALUE 'Y'.
           05  WS-DATA-CHANGED      PIC X VALUE 'N'.

      *****************************************************************
      * SQL COPYBOOK FOR CUSTOMER TABLE
      *****************************************************************
           COPY CUSTDB.

      *****************************************************************
      * CICS COPYBOOK FOR MAP DEFINITIONS
      *****************************************************************
           COPY SCR100M.

       PROCEDURE DIVISION.

       0000-MAIN-SECTION SECTION.
      *****************************************************************
      * Main entry point for the program
      *****************************************************************
           PERFORM 1000-INITIALIZE
           PERFORM 2000-PROCESS-SCREEN
           PERFORM 9000-TERMINATE
           GOBACK.

       1000-INITIALIZE SECTION.
      *****************************************************************
      * Initialize program variables and check security
      *****************************************************************
           MOVE SPACES TO WS-ERROR-MESSAGE
           MOVE ZERO TO WS-RETURN-CODE

      * Check user security access
           CALL 'SECSYS' USING WS-USER-ID WS-RETURN-CODE

           IF WS-RETURN-CODE NOT = 0
               MOVE 'SECURITY ACCESS DENIED' TO WS-ERROR-MESSAGE
               PERFORM 8000-DISPLAY-ERROR
               STOP RUN
           END-IF

      * Initialize CICS environment
           EXEC CICS HANDLE CONDITION
               ERROR(8000-DISPLAY-ERROR)
           END-EXEC.

       2000-PROCESS-SCREEN SECTION.
      *****************************************************************
      * Main screen processing logic
      *****************************************************************
           EVALUATE TRUE
               WHEN WS-FIRST-TIME = 'Y'
                   PERFORM 2100-DISPLAY-INITIAL-SCREEN
                   MOVE 'N' TO WS-FIRST-TIME

               WHEN EIBAID = DFHENTER
                   PERFORM 2200-PROCESS-INQUIRY

               WHEN EIBAID = DFHPF1
                   PERFORM 2300-PROCESS-UPDATE

               WHEN EIBAID = DFHPF3
                   PERFORM 9000-TERMINATE

               WHEN OTHER
                   MOVE 'INVALID KEY PRESSED' TO WS-ERROR-MESSAGE
                   PERFORM 8000-DISPLAY-ERROR
           END-EVALUATE.

       2100-DISPLAY-INITIAL-SCREEN SECTION.
      *****************************************************************
      * Display the initial screen to the user
      *****************************************************************
           EXEC CICS SEND MAP('SCR100M')
               MAPSET('SCR100S')
               ERASE
           END-EXEC.

       2200-PROCESS-INQUIRY SECTION.
      *****************************************************************
      * Process customer inquiry request
      *****************************************************************
           PERFORM 3000-READ-CUSTOMER

           IF WS-RETURN-CODE = 0
               PERFORM 4000-DISPLAY-CUSTOMER
           ELSE
               MOVE 'CUSTOMER NOT FOUND' TO WS-ERROR-MESSAGE
               PERFORM 8000-DISPLAY-ERROR
           END-IF.

       2300-PROCESS-UPDATE SECTION.
      *****************************************************************
      * Process customer update request
      *****************************************************************
           PERFORM 3000-READ-CUSTOMER

           IF WS-RETURN-CODE = 0
               PERFORM 5000-UPDATE-CUSTOMER
               IF WS-RETURN-CODE = 0
                   MOVE 'UPDATE SUCCESSFUL' TO WS-ERROR-MESSAGE
                   PERFORM 8000-DISPLAY-ERROR
               END-IF
           END-IF.

       3000-READ-CUSTOMER SECTION.
      *****************************************************************
      * Read customer record from database
      * Calls: DBREAD - Database read utility
      *****************************************************************
           CALL 'DBREAD' USING
               WS-CUST-ID
               WS-CUSTOMER-RECORD
               WS-RETURN-CODE.

           IF WS-RETURN-CODE NOT = 0
               MOVE 'DATABASE READ ERROR' TO WS-ERROR-MESSAGE
           END-IF.

       4000-DISPLAY-CUSTOMER SECTION.
      *****************************************************************
      * Display customer information on screen
      *****************************************************************
           EXEC CICS SEND MAP('SCR100M')
               MAPSET('SCR100S')
               FROM(WS-CUSTOMER-RECORD)
           END-EXEC.

       5000-UPDATE-CUSTOMER SECTION.
      *****************************************************************
      * Update customer record in database
      * Calls: DBUPDAT - Database update utility
      * Calls: AUDITLOG - Audit logging system
      *****************************************************************
           CALL 'DBUPDAT' USING
               WS-CUSTOMER-RECORD
               WS-RETURN-CODE.

           IF WS-RETURN-CODE = 0
      * Log the update for audit trail
               CALL 'AUDITLOG' USING
                   'SCR100'
                   WS-CUST-ID
                   'UPDATE'
                   WS-USER-ID
           END-IF.

       8000-DISPLAY-ERROR SECTION.
      *****************************************************************
      * Display error message to user
      *****************************************************************
           EXEC CICS SEND MAP('SCR100M')
               MAPSET('SCR100S')
               FROM(WS-ERROR-MESSAGE)
               ALARM
           END-EXEC.

       9000-TERMINATE SECTION.
      *****************************************************************
      * Clean up and terminate program
      *****************************************************************
           EXEC CICS RETURN
           END-EXEC.
