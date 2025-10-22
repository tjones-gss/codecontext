Imports System
Imports System.Data
Imports System.Data.SqlClient

''' <summary>
''' Customer data access layer for legacy VB.NET application
''' Author: Jane Doe
''' Date: 2024-02-01
''' </summary>
Public Class CustomerDataAccess
    Private connectionString As String

    ''' <summary>
    ''' Initialize with database connection string
    ''' </summary>
    Public Sub New(connString As String)
        Me.connectionString = connString
    End Sub

    ''' <summary>
    ''' Retrieve customer by ID
    ''' Related to: SCR100.cbl COBOL screen program
    ''' </summary>
    Public Function GetCustomer(customerId As Integer) As Customer
        Dim customer As New Customer()

        Using conn As New SqlConnection(connectionString)
            Dim cmd As New SqlCommand("SELECT * FROM Customers WHERE CustomerId = @Id", conn)
            cmd.Parameters.AddWithValue("@Id", customerId)

            conn.Open()

            Using reader As SqlDataReader = cmd.ExecuteReader()
                If reader.Read() Then
                    customer.CustomerId = reader.GetInt32(0)
                    customer.CustomerName = reader.GetString(1)
                    customer.Address = reader.GetString(2)
                    customer.Balance = reader.GetDecimal(3)
                End If
            End Using
        End Using

        Return customer
    End Function

    ''' <summary>
    ''' Update customer information
    ''' Calls audit logging service
    ''' </summary>
    Public Function UpdateCustomer(customer As Customer) As Boolean
        Try
            Using conn As New SqlConnection(connectionString)
                Dim cmd As New SqlCommand(
                    "UPDATE Customers SET CustomerName = @Name, Address = @Addr, Balance = @Bal WHERE CustomerId = @Id",
                    conn)

                cmd.Parameters.AddWithValue("@Id", customer.CustomerId)
                cmd.Parameters.AddWithValue("@Name", customer.CustomerName)
                cmd.Parameters.AddWithValue("@Addr", customer.Address)
                cmd.Parameters.AddWithValue("@Bal", customer.Balance)

                conn.Open()
                Dim rowsAffected As Integer = cmd.ExecuteNonQuery()

                ' Log the update
                If rowsAffected > 0 Then
                    LogAuditTrail(customer.CustomerId, "UPDATE")
                End If

                Return rowsAffected > 0
            End Using
        Catch ex As Exception
            ' Log error
            Console.WriteLine("Error updating customer: " & ex.Message)
            Return False
        End Try
    End Function

    ''' <summary>
    ''' Internal audit logging method
    ''' </summary>
    Private Sub LogAuditTrail(customerId As Integer, action As String)
        ' Implementation for audit logging
        Console.WriteLine($"Audit: Customer {customerId} - {action}")
    End Sub
End Class

''' <summary>
''' Customer entity class
''' </summary>
Public Class Customer
    Public Property CustomerId As Integer
    Public Property CustomerName As String
    Public Property Address As String
    Public Property Balance As Decimal
End Class
