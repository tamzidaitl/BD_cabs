using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVehiclePhotoUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing rows get an empty array so the NOT NULL add succeeds; new rows
            // are written with their actual photo list by the app.
            migrationBuilder.AddColumn<List<string>>(
                name: "PhotoUrls",
                table: "Vehicles",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoUrls",
                table: "Vehicles");
        }
    }
}
