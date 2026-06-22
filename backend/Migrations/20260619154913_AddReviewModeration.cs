using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAt",
                table: "Reviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModeratedBy",
                table: "Reviews",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModerationReason",
                table: "Reviews",
                type: "character varying(280)",
                maxLength: 280,
                nullable: true);

            // Existing reviews backfill to Visible so they stay public.
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Reviews",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Visible");

            migrationBuilder.CreateTable(
                name: "CorporateRentalContracts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CorporateId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Period = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Currency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    RateMinor = table.Column<int>(type: "integer", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ServicePurpose = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    Notes = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateRentalContracts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CorporateRentalDrivers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UnassignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateRentalDrivers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_Status",
                table: "Reviews",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalContracts_CorporateId",
                table: "CorporateRentalContracts",
                column: "CorporateId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalContracts_OwnerId",
                table: "CorporateRentalContracts",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalContracts_Status",
                table: "CorporateRentalContracts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalContracts_VehicleId",
                table: "CorporateRentalContracts",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalDrivers_ContractId",
                table: "CorporateRentalDrivers",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalDrivers_DriverId",
                table: "CorporateRentalDrivers",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateRentalDrivers_OwnerId",
                table: "CorporateRentalDrivers",
                column: "OwnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CorporateRentalContracts");

            migrationBuilder.DropTable(
                name: "CorporateRentalDrivers");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_Status",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ModeratedAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ModeratedBy",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ModerationReason",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Reviews");
        }
    }
}
