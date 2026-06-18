using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFleetOwnerFlows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "Vehicles",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Vehicles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "FleetDrivers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    InvitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FleetDrivers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FleetProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    TradeLicenseNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    NidNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    BankAccount = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FleetProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FleetProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DocumentUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Number = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleDocuments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FleetDrivers_OwnerId",
                table: "FleetDrivers",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_FleetDrivers_OwnerId_DriverId",
                table: "FleetDrivers",
                columns: new[] { "OwnerId", "DriverId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FleetProfiles_UserId",
                table: "FleetProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDocuments_OwnerId",
                table: "VehicleDocuments",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDocuments_VehicleId",
                table: "VehicleDocuments",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FleetDrivers");

            migrationBuilder.DropTable(
                name: "FleetProfiles");

            migrationBuilder.DropTable(
                name: "VehicleDocuments");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Vehicles");
        }
    }
}
