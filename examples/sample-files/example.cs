using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace CustomerManagement
{
    /// <summary>
    /// Modern C# implementation of customer service layer
    /// Replaces legacy COBOL and VB.NET implementations
    /// Author: Bob Johnson
    /// Date: 2024-03-01
    /// Related: SCR100.cbl, CustomerDataAccess.vb
    /// </summary>
    public class CustomerService
    {
        private readonly string _connectionString;
        private readonly IAuditLogger _auditLogger;

        public CustomerService(string connectionString, IAuditLogger auditLogger)
        {
            _connectionString = connectionString;
            _auditLogger = auditLogger;
        }

        /// <summary>
        /// Retrieve customer by ID (async version)
        /// Replaces: DBREAD COBOL utility
        /// </summary>
        public async Task<Customer> GetCustomerAsync(int customerId)
        {
            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                using (var cmd = new SqlCommand(
                    "SELECT CustomerId, CustomerName, Address, Balance FROM Customers WHERE CustomerId = @Id",
                    conn))
                {
                    cmd.Parameters.AddWithValue("@Id", customerId);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new Customer
                            {
                                CustomerId = reader.GetInt32(0),
                                CustomerName = reader.GetString(1),
                                Address = reader.GetString(2),
                                Balance = reader.GetDecimal(3)
                            };
                        }
                    }
                }
            }

            return null;
        }

        /// <summary>
        /// Update customer information with validation
        /// Replaces: DBUPDAT COBOL utility
        /// Calls: IAuditLogger.LogAsync for audit trail
        /// </summary>
        public async Task<bool> UpdateCustomerAsync(Customer customer)
        {
            if (customer == null)
                throw new ArgumentNullException(nameof(customer));

            // Validate customer data
            if (!ValidateCustomer(customer))
                throw new ValidationException("Invalid customer data");

            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    using (var transaction = conn.BeginTransaction())
                    {
                        try
                        {
                            using (var cmd = new SqlCommand(
                                @"UPDATE Customers
                                  SET CustomerName = @Name,
                                      Address = @Address,
                                      Balance = @Balance,
                                      LastModified = GETDATE()
                                  WHERE CustomerId = @Id",
                                conn,
                                transaction))
                            {
                                cmd.Parameters.AddWithValue("@Id", customer.CustomerId);
                                cmd.Parameters.AddWithValue("@Name", customer.CustomerName);
                                cmd.Parameters.AddWithValue("@Address", customer.Address);
                                cmd.Parameters.AddWithValue("@Balance", customer.Balance);

                                var rowsAffected = await cmd.ExecuteNonQueryAsync();

                                if (rowsAffected > 0)
                                {
                                    // Log audit trail
                                    await _auditLogger.LogAsync(new AuditEntry
                                    {
                                        EntityType = "Customer",
                                        EntityId = customer.CustomerId.ToString(),
                                        Action = "UPDATE",
                                        Timestamp = DateTime.UtcNow,
                                        UserId = GetCurrentUserId()
                                    });

                                    transaction.Commit();
                                    return true;
                                }

                                transaction.Rollback();
                                return false;
                            }
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
            }
            catch (SqlException ex)
            {
                // Log error (simplified)
                Console.WriteLine($"Database error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Validate customer data before update
        /// </summary>
        private bool ValidateCustomer(Customer customer)
        {
            if (customer.CustomerId <= 0)
                return false;

            if (string.IsNullOrWhiteSpace(customer.CustomerName))
                return false;

            if (customer.Balance < 0)
                return false;

            return true;
        }

        /// <summary>
        /// Get current user ID from context
        /// </summary>
        private string GetCurrentUserId()
        {
            // Simplified - in production, get from security context
            return "SYSTEM";
        }

        /// <summary>
        /// Search customers by name (new functionality)
        /// </summary>
        public async Task<IEnumerable<Customer>> SearchCustomersAsync(string searchTerm)
        {
            var customers = new List<Customer>();

            using (var conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                using (var cmd = new SqlCommand(
                    "SELECT CustomerId, CustomerName, Address, Balance FROM Customers WHERE CustomerName LIKE @Search",
                    conn))
                {
                    cmd.Parameters.AddWithValue("@Search", $"%{searchTerm}%");

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            customers.Add(new Customer
                            {
                                CustomerId = reader.GetInt32(0),
                                CustomerName = reader.GetString(1),
                                Address = reader.GetString(2),
                                Balance = reader.GetDecimal(3)
                            });
                        }
                    }
                }
            }

            return customers;
        }
    }

    public class Customer
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Address { get; set; }
        public decimal Balance { get; set; }
    }

    public interface IAuditLogger
    {
        Task LogAsync(AuditEntry entry);
    }

    public class AuditEntry
    {
        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public string Action { get; set; }
        public DateTime Timestamp { get; set; }
        public string UserId { get; set; }
    }

    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }
}
