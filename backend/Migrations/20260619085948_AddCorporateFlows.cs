using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorporateFlows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CorporateBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CorporateId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleTypeId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PickupLat = table.Column<double>(type: "double precision", nullable: false),
                    PickupLng = table.Column<double>(type: "double precision", nullable: false),
                    PickupAddress = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    DestLat = table.Column<double>(type: "double precision", nullable: false),
                    DestLng = table.Column<double>(type: "double precision", nullable: false),
                    DestAddress = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    DistanceMeters = table.Column<int>(type: "integer", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    FareEstimateMinor = table.Column<int>(type: "integer", nullable: false),
                    FinalFareMinor = table.Column<int>(type: "integer", nullable: true),
                    AllocationMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PreferredFleetId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovalRequired = table.Column<bool>(type: "boolean", nullable: false),
                    RejectionReason = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    Notes = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    ScheduledFor = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecurringId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateBookings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CorporateEmployees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CorporateId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    Phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MonthlySpendLimitMinor = table.Column<int>(type: "integer", nullable: true),
                    RequiresApproval = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateEmployees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CorporateProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    TradeLicenseNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    BillingEmail = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    BillingAddress = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CorporateProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CorporateRecurringRides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CorporateId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    PickupLat = table.Column<double>(type: "double precision", nullable: false),
                    PickupLng = table.Column<double>(type: "double precision", nullable: false),
                    PickupAddress = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    DestLat = table.Column<double>(type: "double precision", nullable: false),
                    DestLng = table.Column<double>(type: "double precision", nullable: false),
                    DestAddress = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    VehicleTypeId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AllocationMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PreferredFleetId = table.Column<Guid>(type: "uuid", nullable: true),
                    DaysOfWeek = table.Column<List<int>>(type: "integer[]", nullable: false),
                    TimeOfDay = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateRecurringRides", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CorporateBookings_CorporateId",
                table: "CorporateBookings",
                column: "CorporateId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateBookings_EmployeeId",
                table: "CorporateBookings",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateBookings_Status",
                table: "CorporateBookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateEmployees_CorporateId",
                table: "CorporateEmployees",
                column: "CorporateId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateProfiles_UserId",
                table: "CorporateProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRecurringRides_CorporateId",
                table: "CorporateRecurringRides",
                column: "CorporateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CorporateBookings");

            migrationBuilder.DropTable(
                name: "CorporateEmployees");

            migrationBuilder.DropTable(
                name: "CorporateProfiles");

            migrationBuilder.DropTable(
                name: "CorporateRecurringRides");
        }
    }
}
